// app/src/main/java/com/tipsplit/ai/HistoryActivity.kt
package com.tipsplit.ai

import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query

class HistoryActivity : AppCompatActivity() {

    private lateinit var container: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val pad = (18 * resources.displayMetrics.density).toInt()
        val scrollView = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#0B172A"))
        }

        container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }

        val header = TextView(this).apply {
            text = "Cloud Voice Logs"
            textSize = 22f
            setTextColor(Color.parseColor("#D4AF37"))
            setPadding(0, 0, 0, pad / 2)
        }

        val backBtn = Button(this).apply {
            text = "← Back to Calculator"
            setOnClickListener { finish() }
        }

        container.addView(header)
        container.addView(backBtn)
        scrollView.addView(container)
        setContentView(scrollView)

        val currentUser = FirebaseAuth.getInstance().currentUser
        if (currentUser == null) {
            addInfoRow("No active cloud session yet. Use Voice Input once to initialize cloud logs.")
            return
        }

        FirebaseFirestore.getInstance().collection("voiceLogs")
            .whereEqualTo("userId", currentUser.uid)
            .orderBy("timestamp", Query.Direction.DESCENDING)
            .limit(20)
            .get()
            .addOnSuccessListener { result ->
                if (result.isEmpty) {
                    addInfoRow("No voice logs recorded yet.")
                } else {
                    for (doc in result) {
                        val input = doc.getString("input") ?: "(empty)"
                        val timestamp = doc.getTimestamp("timestamp")?.toDate()?.toString() ?: "Just now"
                        addInfoRow("$timestamp\n\"$input\"")
                    }
                }
            }
            .addOnFailureListener { e ->
                addInfoRow("Error loading history: ${e.message}")
            }
    }

    private fun addInfoRow(textValue: String) {
        val pad = (12 * resources.displayMetrics.density).toInt()
        val tv = TextView(this).apply {
            text = textValue
            textSize = 15f
            setTextColor(Color.WHITE)
            setPadding(pad, pad, pad, pad)
        }
        container.addView(tv)
    }
}