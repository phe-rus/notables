package notables.pherus.org

import android.content.pm.PackageManager
import android.os.Build
import android.webkit.WebView

/** Android 17 protects LAN sockets separately from internet access. */
class LocalNetworkAccess(private val activity: MainActivity, private val webView: WebView) {
  private var requesting = false

  fun request() {
    if (Build.VERSION.SDK_INT < 37) return
    val permission = "android.permission.ACCESS_LOCAL_NETWORK"
    if (activity.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) return
    webView.post {
      if (requesting) return@post
      requesting = true
      activity.requestPermissions(arrayOf(permission)) { granted ->
        requesting = false
        if (granted == true) {
          webView.evaluateJavascript(
            "window.dispatchEvent(new Event('notables:local-network-ready'))", null
          )
        }
      }
    }
  }
}
