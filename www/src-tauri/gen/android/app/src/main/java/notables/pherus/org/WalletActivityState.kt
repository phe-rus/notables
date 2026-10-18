package notables.pherus.org

import androidx.annotation.Keep

/** Native activity callbacks are the authority for Wallet visibility. */
@Keep
object WalletActivityState {
  @Volatile private var resumed = false
  @Volatile private var focused = false

  fun resumed(value: Boolean) { resumed = value }
  fun focused(value: Boolean) { focused = value }

  @JvmStatic fun isActive(): Boolean = resumed && focused
}
