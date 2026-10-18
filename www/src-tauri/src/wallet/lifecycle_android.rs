use jni::objects::{JClass, JObject, JValue};

use crate::wallet::error::{Result, WalletError};

/// Read Android's activity state, never a value supplied by the WebView.
pub fn is_active() -> Result<bool> {
    let context = ndk_context::android_context();
    // Tao retains these application JNI globals for the process lifetime.
    let vm = unsafe { jni::JavaVM::from_raw(context.vm().cast()) }
        .map_err(|_| WalletError::Unavailable)?;
    let mut env = vm
        .attach_current_thread()
        .map_err(|_| WalletError::Unavailable)?;
    let application = unsafe { JObject::from_raw(context.context().cast()) };
    let result = env.with_local_frame(16, |env| -> jni::errors::Result<bool> {
        let loader = env
            .call_method(
                &application,
                "getClassLoader",
                "()Ljava/lang/ClassLoader;",
                &[],
            )?
            .l()?;
        let name = env.new_string("notables.pherus.org.WalletActivityState")?;
        let class = env
            .call_method(
                loader,
                "loadClass",
                "(Ljava/lang/String;)Ljava/lang/Class;",
                &[JValue::Object(name.as_ref())],
            )?
            .l()?;
        env.call_static_method(JClass::from(class), "isActive", "()Z", &[])?
            .z()
    });
    if result.is_err() {
        let _ = env.exception_clear();
    }
    result.map_err(|_| WalletError::Unavailable)
}
