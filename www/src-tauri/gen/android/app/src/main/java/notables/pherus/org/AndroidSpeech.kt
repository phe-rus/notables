package notables.pherus.org

import android.content.Context
import android.media.AudioAttributes
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONStringer
import java.util.Locale

/**
 * The phone's own voices, through TextToSpeech: the WebView has no Web
 * Speech voices on Android. The page asks through AndroidBridge and hears
 * back through `window.__notablesSpeech(id, event)`
 * (www/src/platform/android-speech.ts).
 */
class AndroidSpeech(context: Context, private val webView: WebView) {
  private var ready = false
  private val engine: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
    ready = status == TextToSpeech.SUCCESS
    report("", if (ready) "ready" else "unavailable")
  }

  init {
    // Read on the media stream, so the volume buttons and other audio behave as for a book.
    engine.setAudioAttributes(
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build(),
    )
    engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(utteranceId: String) {}

      override fun onDone(utteranceId: String) = report(utteranceId, "done")

      @Deprecated("Kept for older engines")
      override fun onError(utteranceId: String) = report(utteranceId, "error")

      override fun onError(utteranceId: String, errorCode: Int) = report(utteranceId, "error")

      override fun onStop(utteranceId: String, interrupted: Boolean) = report(utteranceId, "stopped")
    })
  }

  /** The installed voices as JSON, or null while the engine is still starting. */
  fun voices(): String? {
    if (!ready) return null
    val list = JSONArray()
    val voices: Set<Voice> = runCatching { engine.voices }.getOrNull() ?: emptySet()
    for (voice in voices.sortedBy { it.name }) {
      if (voice.features?.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED) == true) continue
      list.put(
        JSONObject()
          .put("id", voice.name)
          .put("lang", voice.locale.toLanguageTag())
          .put("language", voice.locale.getDisplayName(Locale.getDefault()))
          .put("quality", voice.quality)
          .put("network", voice.isNetworkConnectionRequired),
      )
    }
    return list.toString()
  }

  /** Says `text` and reports "done", "error" or "stopped" for `id`. */
  fun speak(id: String, text: String, lang: String, voiceId: String, rate: Float) {
    if (!ready) {
      report(id, "error")
      return
    }
    val voice = engine.voices?.firstOrNull { it.name == voiceId }
    if (voice != null) {
      engine.setVoice(voice)
    } else {
      engine.setLanguage(Locale.forLanguageTag(lang))
    }
    engine.setSpeechRate(rate)
    val params = Bundle().apply { putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1f) }
    if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, params, id) != TextToSpeech.SUCCESS) {
      report(id, "error")
    }
  }

  fun stop() {
    engine.stop()
  }

  fun shutdown() {
    engine.shutdown()
  }

  private fun report(id: String, event: String) {
    val args = JSONStringer().array().value(id).value(event).endArray().toString()
    webView.post {
      webView.evaluateJavascript("window.__notablesSpeech && window.__notablesSpeech(...$args)", null)
    }
  }
}
