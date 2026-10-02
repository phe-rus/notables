use std::fs::File;
use std::io::{self, Read, Write};
use std::path::Path;

use sha2::{Digest, Sha256};

/// Writes through a temporary file and a rename, so a crash never leaves a
/// half written record.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let temporary = path.with_extension("tmp");
    let mut file = File::create(&temporary)?;
    file.write_all(bytes)?;
    file.sync_all()?;
    std::fs::rename(temporary, path)
}

/// The SHA-256 of a file, as lowercase hex. Blocking: run off the async runtime.
pub fn sha256_hex(path: &Path) -> io::Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 1 << 20];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}

/// Bytes free on the volume holding `path` (or its nearest existing parent).
pub fn available_space(path: &Path) -> io::Result<u64> {
    let mut probe = path;
    while !probe.exists() {
        probe = probe.parent().unwrap_or(Path::new("."));
    }
    fs4::available_space(probe)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashes_files() {
        let path = std::env::temp_dir().join("notables-sha256-test");
        std::fs::write(&path, b"abc").unwrap();
        assert_eq!(
            sha256_hex(&path).unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        std::fs::remove_file(path).unwrap();
    }
}
