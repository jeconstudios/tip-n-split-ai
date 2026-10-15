package com.tipsplit.ai

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

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

        // File access - unsafe for production. Gate by debug flag.
        // For production builds, set these to false.
        settings.allowFileAccess = true
        if (BuildConfig.DEBUG) {
            // Only enable these in debug/dev when strictly needed
            settings.allowFileAccessFromFileURLs = true
            settings.allowUniversalAccessFromFileURLs = true
        } else {
            settings.allowFileAccessFromFileURLs = false
            settings.allowUniversalAccessFromFileURLs = false
        }

        // Prevent mixed content loading unless explicitly required
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        // Enable Safe Browsing where available
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                WebView.enableSafeBrowsing(this)
            } catch (e: Exception) {
                Log.w("MainActivity", "Safe browsing enable failed: ${e.message}")
            }
        }

        // Helpful during development to see console logs in logcat
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                // Keep asset/internal links in the WebView, open external links in browser.
                return if (url.startsWith("file://") || url.startsWith("about:blank") || Uri.parse(url).host == null) {
                    false
                } else {
                    // Open external links in system browser
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d("WebView", "${consoleMessage.message()} -- ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()}")
                return true
            }
        }

        webView.loadUrl("file:///android_asset/index.html")

        // make WebView fill most of the screen
        val webParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            1f
        )
        webView.layoutParams = webParams

        // Bridge for navigation from JS - ensure UI actions run on main thread
        webView.addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun navigateTo(section: String) {
                runOnUiThread {
                    when (section) {
                        "history" -> {
                            val intent = Intent(this@MainActivity, HistoryActivity::class.java)
                            startActivity(intent)
                        }
                        "voice" -> {
                            val intent = Intent(this@MainActivity, VoiceInputActivity::class.java)
                            startActivity(intent)
                        }
                        else -> {
                            // handle other sections if needed
                        }
                    }
                }
            }
        }, "AndroidBridge")

        val voiceButton = Button(this).apply {
            text = "Open Voice Input"
            setOnClickListener {
                val intent = Intent(this@MainActivity, VoiceInputActivity::class.java)
                startActivity(intent)
            }
        }
        val btnParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            val margin = (8 * resources.displayMetrics.density).toInt()
            setMargins(margin, margin, margin, margin)
        }
        voiceButton.layoutParams = btnParams

        layout.addView(webView)
        layout.addView(voiceButton)

        setContentView(layout)
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        // Clean up WebView to avoid leaks
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