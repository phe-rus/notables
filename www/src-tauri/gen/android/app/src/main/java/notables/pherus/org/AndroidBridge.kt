package notables.pherus.org

import android.app.Activity
import android.app.ActivityManager
import android.graphics.Color
import android.appwidget.AppWidgetManager
import android.content.res.Configuration
import android.content.Intent
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
 * Today widget to the home screen.
 */
class AndroidBridge(private val activity: Activity, private val webView: WebView) {
  @JavascriptInterface
  fun hasHardwareKeyboard(): Boolean =
    activity.resources.configuration.keyboard == Configuration.KEYBOARD_QWERTY

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

  /** ChromeOS owns the caption; give it the same opaque surface as the app. */
  @Suppress("DEPRECATION")
  @JavascriptInterface
  fun setWindowBackground(hex: String) {
    if (!activity.packageManager.hasSystemFeature("org.chromium.arc") &&
        !activity.packageManager.hasSystemFeature("android.hardware.type.pc")) return
    if (!Regex("#[0-9a-fA-F]{6}").matches(hex)) return
    val color = Color.parseColor(hex)
    activity.runOnUiThread {
      activity.setTaskDescription(ActivityManager.TaskDescription(null, null, color))
      activity.window.statusBarColor = color
      activity.window.navigationBarColor = color
    }
  }

  /** Maker and model, e.g. "TECNO CAMON 19", for About. */
  @JavascriptInterface
  fun deviceModel(): String {
    if (activity.packageManager.hasSystemFeature("org.chromium.arc")) return Build.MODEL
    val maker = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
    return if (Build.MODEL.startsWith(maker, ignoreCase = true)) Build.MODEL else "$maker ${Build.MODEL}"
  }

  /** Let Android offer the person's installed sharing transports and apps. */
  @JavascriptInterface
  fun shareText(title: String, text: String): Boolean {
    if (text.isBlank() || text.length > 16384 || title.length > 1024) return false
    activity.runOnUiThread {
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, title)
        putExtra(Intent.EXTRA_TEXT, text)
      }
      activity.startActivity(Intent.createChooser(intent, null))
    }
    return true
  }

  companion object {
    const val NAME = "NotablesAndroid"
  }
}
