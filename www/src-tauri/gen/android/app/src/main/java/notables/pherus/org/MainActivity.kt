package notables.pherus.org

import android.os.Bundle
import android.view.View
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import notables.pherus.org.widgets.TodayWidgetProvider

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    fitAboveKeyboard(findViewById(android.R.id.content))
  }

  override fun onWebViewCreate(webView: WebView) {
    webView.addJavascriptInterface(AndroidBridge(this, webView), AndroidBridge.NAME)
  }

  /** Leaving the app shows what changed on the home-screen widget right away. */
  override fun onPause() {
    super.onPause()
    TodayWidgetProvider.refreshAll(this)
  }

  /**
   * Edge to edge, Android no longer resizes the window for the keyboard, so
   * the web view would pan the whole page, top bar included, out of view.
   * Instead the web view ends where the keyboard starts, and while the
   * keyboard is up the page gets no bottom inset for the gesture bar it hides.
   */
  private fun fitAboveKeyboard(content: View) {
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
      view.setPadding(0, 0, 0, keyboard)
      if (keyboard == 0) {
        insets
      } else {
        val bars = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
        WindowInsetsCompat.Builder(insets)
          .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
          .setInsets(
            WindowInsetsCompat.Type.navigationBars(),
            Insets.of(bars.left, 0, bars.right, 0),
          )
          .build()
      }
    }
  }
}
