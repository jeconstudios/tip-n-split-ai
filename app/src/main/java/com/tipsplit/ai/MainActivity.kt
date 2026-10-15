// app/src/main/java/com/tipsplit/ai/MainActivity.kt
package com.tipsplit.ai

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null

    private val voiceActivityLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val transcript = result.data?.getStringExtra(VoiceInputActivity.EXTRA_VOICE_TRANSCRIPT)
            if (!transcript.isNullOrBlank() && ::webView.isInitialized) {
                val safeJsString = JSONObject.quote(transcript)
                webView.evaluateJavascript("applyNaturalLanguageToCalculator($safeJsString);", null)
            }
        }
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = filePathCallback ?: return@registerForActivityResult
        val uris: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val dataUri = result.data?.data
            if (dataUri != null) arrayOf(dataUri) else null
        } else {
            null
        }
        callback.onReceiveValue(uris)
        filePathCallback = null
    }

    private val runtimePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val request = pendingWebPermissionRequest ?: return@registerForActivityResult
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            request.grant(request.resources)
        } else {
            request.deny()
        }
        pendingWebPermissionRequest = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        webView = WebView(this)
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true

        if (BuildConfig.DEBUG) {
            settings.allowFileAccessFromFileURLs = true
            settings.allowUniversalAccessFromFileURLs = true
            WebView.setWebContentsDebuggingEnabled(true)
        } else {
            settings.allowFileAccessFromFileURLs = false
            settings.allowUniversalAccessFromFileURLs = false
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                WebView.enableSafeBrowsing(this) { success ->
                    if (!success) Log.w("MainActivity", "SafeBrowsing initialization declined")
                }
            } catch (e: Exception) {
                Log.w("MainActivity", "Safe browsing enable failed: ${e.message}")
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return handleUriNavigation(request.url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                return handleUriNavigation(Uri.parse(url))
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(
                    "WebView",
                    "${consoleMessage.message()} -- ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()}"
                )
                return true
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                return try {
                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "image/*"
                    }
                    fileChooserLauncher.launch(Intent.createChooser(intent, "Select or Capture Receipt"))
                    true
                } catch (e: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback = null
                    Toast.makeText(this@MainActivity, "No image picker available", Toast.LENGTH_SHORT).show()
                    false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val neededPermissions = mutableListOf<String>()
                    for (res in request.resources) {
                        if (res == PermissionRequest.RESOURCE_AUDIO_CAPTURE &&
                            ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
                        ) {
                            neededPermissions.add(Manifest.permission.RECORD_AUDIO)
                        }
                        if (res == PermissionRequest.RESOURCE_VIDEO_CAPTURE &&
                            ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED
                        ) {
                            neededPermissions.add(Manifest.permission.CAMERA)
                        }
                    }

                    if (neededPermissions.isEmpty()) {
                        request.grant(request.resources)
                    } else {
                        pendingWebPermissionRequest = request
                        runtimePermissionLauncher.launch(neededPermissions.toTypedArray())
                    }
                }
            }
        }

        webView.addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun navigateTo(section: String) {
                runOnUiThread {
                    when (section) {
                        "history" -> {
                            startActivity(Intent(this@MainActivity, HistoryActivity::class.java))
                        }
                        "voice" -> {
                            voiceActivityLauncher.launch(Intent(this@MainActivity, VoiceInputActivity::class.java))
                        }
                    }
                }
            }
        }, "AndroidBridge")

        webView.loadUrl("file:///android_asset/index.html")

        val webParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.MATCH_PARENT
        )
        webView.layoutParams = webParams
        layout.addView(webView)
        setContentView(layout)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun handleUriNavigation(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase() ?: return false
        if (scheme == "file" || scheme == "about") {
            return false
        }

        return try {
            val intent = Intent(Intent.ACTION_VIEW, uri)
            startActivity(intent)
            true
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(this, "No app installed to handle this link", Toast.LENGTH_SHORT).show()
            true
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.settings.javaScriptEnabled = false
            webView.webChromeClient = null
            webView.webViewClient = null
            webView.removeAllViews()
            webView.destroy()
        }
        super.onDestroy()
    }
}