package org.pherus.notables

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import androidx.annotation.Keep
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Native JNI only. Never exposed to the WebView JavaScript bridge. */
@Keep
object WalletDeviceKeys {
  private fun alias(reference: String): String {
    require(reference.isNotEmpty() && reference.length <= 256)
    val digest = MessageDigest.getInstance("SHA-256").digest(reference.toByteArray(Charsets.UTF_8))
    return "notables.wallet." + digest.joinToString("") { "%02x".format(it) }
  }

  @Keep
  @JvmStatic
  @Synchronized
  fun access(context: Context, operation: String, reference: String, input: ByteArray): ByteArray {
    val alias = alias(reference)
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    val directory = File(context.noBackupFilesDir, "wallet-keys")
    val file = AtomicFile(File(directory, alias))
    when (operation) {
      "remove" -> {
        file.delete()
        if (store.containsAlias(alias)) store.deleteEntry(alias)
        return byteArrayOf()
      }
      "write" -> {
        require(input.size == 32)
        check(!store.containsAlias(alias) && !file.baseFile.exists())
        check(directory.isDirectory || directory.mkdirs())
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
          .setKeySize(256)
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setUserAuthenticationRequired(false)
          .build())
        val key = generator.generateKey()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        cipher.updateAAD(reference.toByteArray(Charsets.UTF_8))
        val encrypted = cipher.doFinal(input)
        val output = file.startWrite()
        try {
          output.write(byteArrayOf(1))
          output.write(cipher.iv)
          output.write(encrypted)
          file.finishWrite(output)
        } catch (error: Exception) {
          file.failWrite(output)
          throw error
        } finally {
          input.fill(0)
        }
        return byteArrayOf()
      }
      "read" -> {
        val wrapped = file.readFully()
        require(wrapped.size == 61 && wrapped[0] == 1.toByte())
        val key = store.getKey(alias, null) as SecretKey
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, wrapped.copyOfRange(1, 13)))
        cipher.updateAAD(reference.toByteArray(Charsets.UTF_8))
        return cipher.doFinal(wrapped, 13, wrapped.size - 13)
      }
      else -> error("Unsupported wallet key operation")
    }
  }
}
