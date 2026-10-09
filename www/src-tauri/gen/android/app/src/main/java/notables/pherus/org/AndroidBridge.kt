package notables.pherus.org

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.view.WindowCompat
import notables.pherus.org.widgets.TodayWidgetProvider

/**
 * What the page asks of Android directly, as `window.NotablesAndroid`
 * (www/src/platform/android-bridge.ts): system haptics, status and
 * navigation bar icons that match the app's appearance, adding the
 * Today widget to the home screen, and the phone's voices for reading aloud.
 */
class AndroidBridge(private val activity: Activity, private val webView: WebView) {
  /** Started on first use, so the app opens without waiting for the speech engine. */
  private var started: AndroidSpeech? = null
  private val speech: AndroidSpeech
    get() = started ?: AndroidSpeech(activity, webView).also { started = it }

  /** Whether this launcher lets an app offer its widget for the home screen. */
  @JavascriptInterface
  fun canPinWidget(): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      AppWidgetManager.getInstance(activity).isRequestPinAppWidgetSupported

  /** Shows the system sheet that adds the Today widget to the home screen. */
  @JavascriptInterface
  fun pinWidget(): Boolean {
    if (!canPinWidget()) return false
    val manager = AppWidgetManager.getInstance(activity)
    return manager.requestPinAppWidget(ComponentName(activity, TodayWidgetProvider::class.java), null, null)
  }

  /**
   * The system's own haptic patterns, which follow the person's touch
   * feedback setting. Kinds match www/src/platform/haptics.ts.
   */
  @JavascriptInterface
  fun haptic(kind: String) {
    val constant = when (kind) {
      "selection" -> HapticFeedbackConstants.CLOCK_TICK
      "light" -> HapticFeedbackConstants.KEYBOARD_TAP
      "medium" -> HapticFeedbackConstants.CONTEXT_CLICK
      "heavy" -> HapticFeedbackConstants.LONG_PRESS
      "success" ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) HapticFeedbackConstants.CONFIRM
        else HapticFeedbackConstants.CONTEXT_CLICK
      "warning", "error" ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) HapticFeedbackConstants.REJECT
        else HapticFeedbackConstants.LONG_PRESS
      else -> return
    }
    webView.post { webView.performHapticFeedback(constant) }
  }

  /**
   * The bars' icons follow the app's own appearance, which can differ from
   * the system's: a light app on a dark phone needs dark icons to show.
   */
  @JavascriptInterface
  fun setSystemBarsDark(dark: Boolean) {
    activity.runOnUiThread {
      val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
      controller.isAppearanceLightStatusBars = !dark
      controller.isAppearanceLightNavigationBars = !dark
    }
  }

  /** Maker and model, e.g. "TECNO CAMON 19", for About. */
  @JavascriptInterface
  fun deviceModel(): String {
    val maker = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
    return if (Build.MODEL.startsWith(maker, ignoreCase = true)) Build.MODEL else "$maker ${Build.MODEL}"
  }

  /** The phone's voices as JSON, or null while the speech engine starts. */
  @JavascriptInterface
  fun speechVoices(): String? = speech.voices()

  @JavascriptInterface
  fun speak(id: String, text: String, lang: String, voiceId: String, rate: Float) =
    speech.speak(id, text, lang, voiceId, rate)

  @JavascriptInterface
  fun stopSpeaking() = speech.stop()

  /** Lets the speech engine go with the activity. */
  fun close() {
    started?.shutdown()
    started = null
  }

  companion object {
    const val NAME = "NotablesAndroid"
  }
}
