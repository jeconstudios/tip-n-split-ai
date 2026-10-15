// app/src/main/java/com/tipsplit/ai/VoiceInputActivity.kt
package com.tipsplit.ai

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import java.util.Locale

class VoiceInputActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_VOICE_TRANSCRIPT = "extra_voice_transcript"
        private const val REQUEST_RECORD_AUDIO = 1001
        private const val PREF_CONSENT = "pref_consent_v1"
    }

    private var recognizer: SpeechRecognizer? = null
    private lateinit var statusView: TextView
    private lateinit var transcriptView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val pad = (24 * resources.displayMetrics.density).toInt()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0B172A"))
            setPadding(pad, pad, pad, pad)
        }

        statusView = TextView(this).apply {
            text = "Initializing Voice Split..."
            textSize = 20f
            setTextColor(Color.parseColor("#D4AF37"))
            gravity = Gravity.CENTER
        }

        transcriptView = TextView(this).apply {
            text = "Say e.g. \"Bill is 85 dollars, tax is 6.80, 20% tip, split 4 ways\""
            textSize = 15f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, pad / 2, 0, pad)
        }

        val cancelBtn = Button(this).apply {
            text = "Cancel"
            setOnClickListener {
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }

        layout.addView(statusView)
        layout.addView(transcriptView)
        layout.addView(cancelBtn)
        setContentView(layout)

        val prefs = getSharedPreferences("app_prefs", MODE_PRIVATE)
        val consentGiven = prefs.getBoolean(PREF_CONSENT, false)
        if (!consentGiven) {
            showConsentDialog { accepted ->
                if (accepted) {
                    prefs.edit().putBoolean(PREF_CONSENT, true).apply()
                    checkAuthAndStart()
                } else {
                    setResult(Activity.RESULT_CANCELED)
                    finish()
                }
            }
        } else {
            checkAuthAndStart()
        }
    }

    private fun showConsentDialog(onResult: (Boolean) -> Unit) {
        AlertDialog.Builder(this)
            .setTitle("Voice Input Consent")
            .setMessage("By using voice input we will convert your spoken words to text to populate the calculator and store the transcript securely in your account. Do you consent to this?")
            .setCancelable(false)
            .setPositiveButton("I Consent") { _, _ -> onResult(true) }
            .setNegativeButton("Cancel") { _, _ -> onResult(false) }
            .show()
    }

    private fun checkAuthAndStart() {
        val auth = FirebaseAuth.getInstance()
        if (auth.currentUser == null) {
            auth.signInAnonymously().addOnCompleteListener {
                startListening()
            }
        } else {
            startListening()
        }
    }

    private fun startListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_RECORD_AUDIO)
            return
        }

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Toast.makeText(this, "Speech recognition not available on this device", Toast.LENGTH_LONG).show()
            setResult(Activity.RESULT_CANCELED)
            finish()
            return
        }

        statusView.text = "🎙️ Listening... Speak Now"
        recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }

        recognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle) {
                val matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val voiceInput = matches[0]
                    transcriptView.text = "You said: \"$voiceInput\""
                    saveTranscriptAndReturn(voiceInput)
                } else {
                    setResult(Activity.RESULT_CANCELED)
                    finish()
                }
            }

            override fun onPartialResults(partialResults: Bundle) {
                val partial = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!partial.isNullOrEmpty()) {
                    transcriptView.text = partial[0]
                }
            }

            override fun onReadyForSpeech(params: Bundle) {
                statusView.text = "🎙️ Listening... Speak Now"
            }

            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray) {}
            override fun onEndOfSpeech() {
                statusView.text = "Processing..."
            }

            override fun onError(error: Int) {
                runOnUiThread {
                    Toast.makeText(this@VoiceInputActivity, "Could not catch that (code $error)", Toast.LENGTH_SHORT).show()
                    setResult(Activity.RESULT_CANCELED)
                    finish()
                }
            }

            override fun onEvent(eventType: Int, params: Bundle) {}
        })

        recognizer?.startListening(intent)
    }

    private fun saveTranscriptAndReturn(voiceInput: String) {
        val resultIntent = Intent().apply {
            putExtra(EXTRA_VOICE_TRANSCRIPT, voiceInput)
        }
        setResult(Activity.RESULT_OK, resultIntent)

        val user = FirebaseAuth.getInstance().currentUser
        if (user != null) {
            val doc = mapOf(
                "input" to voiceInput,
                "userId" to user.uid,
                "timestamp" to FieldValue.serverTimestamp()
            )
            FirebaseFirestore.getInstance().collection("voiceLogs")
                .add(doc)
                .addOnCompleteListener {
                    finish()
                }
        } else {
            finish()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_RECORD_AUDIO) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startListening()
            } else {
                Toast.makeText(this, "Microphone permission is required for voice input", Toast.LENGTH_LONG).show()
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            recognizer?.stopListening()
            recognizer?.cancel()
            recognizer?.destroy()
        } catch (_: Exception) {
        } finally {
            recognizer = null
        }
    }
}