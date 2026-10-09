use super::{DataKey, DeviceKeyStore, KeyStore, Result, WalletError};
use jni::objects::{JByteArray, JClass, JObject, JValue};

impl DeviceKeyStore {
    fn android_key(operation: &str, reference: &str, key: &[u8]) -> Result<Vec<u8>> {
        if reference.is_empty() || reference.len() > 256 {
            return Err(WalletError::CorruptVault);
        }
        let call = || -> jni::errors::Result<Vec<u8>> {
            let context = ndk_context::android_context();
            // Tao owns these global JNI references for the app lifetime. Borrow
            // them, attach this blocking worker, and keep local refs in a frame.
            let vm = unsafe { jni::JavaVM::from_raw(context.vm().cast())? };
            let mut env = vm.attach_current_thread()?;
            let application = unsafe { JObject::from_raw(context.context().cast()) };
            env.with_local_frame(16, |env| {
                let loader = env
                    .call_method(
                        &application,
                        "getClassLoader",
                        "()Ljava/lang/ClassLoader;",
                        &[],
                    )?
                    .l()?;
                let name = env.new_string("notables.pherus.org.WalletDeviceKeys")?;
                let class = env
                    .call_method(
                        loader,
                        "loadClass",
                        "(Ljava/lang/String;)Ljava/lang/Class;",
                        &[JValue::Object(name.as_ref())],
                    )?
                    .l()?;
                let operation = env.new_string(operation)?;
                let reference = env.new_string(reference)?;
                let input = env.byte_array_from_slice(key)?;
                let output = env
                    .call_static_method(
                        JClass::from(class),
                        "access",
                        "(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;[B)[B",
                        &[
                            JValue::Object(&application),
                            JValue::Object(operation.as_ref()),
                            JValue::Object(reference.as_ref()),
                            JValue::Object(input.as_ref()),
                        ],
                    )?
                    .l()?;
                let output = JByteArray::from(output);
                let bytes = env.convert_byte_array(&output)?;
                if !bytes.is_empty() {
                    env.set_byte_array_region(&output, 0, &vec![0; bytes.len()])?;
                }
                Ok(bytes)
            })
            .inspect_err(|_| {
                // Never print Java exception messages, which may expose values.
                let _ = env.exception_clear();
            })
        };
        call().map_err(|_| WalletError::SecureStoreUnavailable)
    }
}

impl KeyStore for DeviceKeyStore {
    fn read(&self, reference: &str) -> Result<DataKey> {
        let secret = zeroize::Zeroizing::new(Self::android_key("read", reference, &[])?);
        if secret.len() != 32 {
            return Err(WalletError::CorruptVault);
        }
        let mut key = zeroize::Zeroizing::new([0; 32]);
        key.copy_from_slice(&secret);
        Ok(key)
    }
    fn write(&self, reference: &str, key: &DataKey) -> Result<()> {
        Self::android_key("write", reference, key.as_ref())?;
        if *self.read(reference)? != **key {
            return Err(WalletError::SecureStoreUnavailable);
        }
        Ok(())
    }
    fn remove(&self, reference: &str) -> Result<()> {
        Self::android_key("remove", reference, &[])?;
        Ok(())
    }
}
