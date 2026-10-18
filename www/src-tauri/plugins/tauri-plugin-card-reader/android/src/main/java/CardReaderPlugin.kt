package org.pherus.cardreader

import android.app.Activity
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

@InvokeArg
class FrameArgs { lateinit var image: String }

@TauriPlugin
class CardReaderPlugin(activity: Activity) : Plugin(activity) {
    private var reader: TextRecognizer? = null
    private var generation = 0
    private var busy = false

    @Command
    fun recognize(invoke: Invoke) {
        val args = invoke.parseArgs(FrameArgs::class.java)
        if (busy || args.image.length > 2_000_000) {
            invoke.reject("reader-busy")
            return
        }
        val recognizer = try {
            reader ?: TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).also { reader = it }
        } catch (_: Exception) {
            invoke.reject("reader-unavailable")
            return
        }
        val bytes = try { Base64.decode(args.image, Base64.NO_WRAP) } catch (_: Exception) {
            invoke.reject("invalid-image")
            return
        }
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (bounds.outWidth !in 1..2400 || bounds.outHeight !in 1..2400) {
            bytes.fill(0)
            invoke.reject("invalid-image")
            return
        }
        val options = BitmapFactory.Options().apply { inMutable = true }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
        bytes.fill(0)
        if (bitmap == null) {
            invoke.reject("invalid-image")
            return
        }
        busy = true
        val token = generation
        recognizer.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener { result ->
                if (token != generation) invoke.reject("cancelled")
                else {
                    val lines = result.textBlocks.flatMap { it.lines }
                    val confidence = lines.mapNotNull { it.confidence }.average()
                    invoke.resolve(JSObject().apply {
                        put("text", result.text.take(20_000))
                        put("confidence", if (confidence.isNaN()) 0.0 else confidence * 100)
                    })
                }
            }
            .addOnFailureListener { invoke.reject("recognition-failed") }
            .addOnCompleteListener {
                bitmap.eraseColor(0)
                bitmap.recycle()
                busy = false
            }
    }

    @Command
    fun cancel(invoke: Invoke) {
        generation++
        invoke.resolve()
    }

    override fun onPause(activity: AppCompatActivity) {
        generation++
        super.onPause(activity)
    }

    override fun onDestroy(activity: AppCompatActivity) {
        generation++
        reader?.close()
        reader = null
        super.onDestroy(activity)
    }
}
