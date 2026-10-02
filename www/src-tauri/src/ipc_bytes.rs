//! Binary payloads from the page. Desktop web views send them as raw IPC
//! bodies; Android's can't hand request bodies to the app, so there Tauri
//! falls back to `postMessage`, which turns the bytes into a JSON array.

use tauri::ipc::InvokeBody;

/// The bytes the page sent, or `None` if the body holds something else.
pub fn bytes(body: &InvokeBody) -> Option<Vec<u8>> {
    match body {
        InvokeBody::Raw(bytes) => Some(bytes.clone()),
        InvokeBody::Json(serde_json::Value::Array(values)) => values
            .iter()
            .map(|value| value.as_u64().and_then(|byte| u8::try_from(byte).ok()))
            .collect(),
        InvokeBody::Json(_) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reads_raw_bodies() {
        assert_eq!(
            bytes(&InvokeBody::Raw(vec![1, 2, 255])),
            Some(vec![1, 2, 255])
        );
    }

    #[test]
    fn reads_the_android_json_array() {
        assert_eq!(
            bytes(&InvokeBody::Json(json!([0, 128, 255]))),
            Some(vec![0, 128, 255])
        );
    }

    #[test]
    fn refuses_anything_that_is_not_bytes() {
        assert_eq!(bytes(&InvokeBody::Json(json!([1, 256]))), None);
        assert_eq!(bytes(&InvokeBody::Json(json!([1, -1]))), None);
        assert_eq!(bytes(&InvokeBody::Json(json!({ "0": 1 }))), None);
    }
}
