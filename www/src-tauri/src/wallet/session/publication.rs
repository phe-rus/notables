use std::path::Path;

use super::super::error::{Result, WalletError};

pub(super) fn publish_vault(staging: &Path, destination: &Path) -> Result<()> {
    #[cfg(target_os = "android")]
    {
        use std::{ffi::CString, os::unix::ffi::OsStrExt};
        let source =
            CString::new(staging.as_os_str().as_bytes()).map_err(|_| WalletError::WriteFailure)?;
        let target = CString::new(destination.as_os_str().as_bytes())
            .map_err(|_| WalletError::WriteFailure)?;
        // Android SELinux denies hard links. Use the kernel syscall so this
        // also works before the renameat2 libc symbol became available.
        // Both C strings live for the call; NOREPLACE preserves existing vaults.
        let result = unsafe {
            libc::syscall(
                libc::SYS_renameat2,
                libc::AT_FDCWD,
                source.as_ptr(),
                libc::AT_FDCWD,
                target.as_ptr(),
                libc::RENAME_NOREPLACE,
            )
        };
        if result != 0 {
            return Err(WalletError::WriteFailure);
        }
    }
    #[cfg(not(target_os = "android"))]
    {
        std::fs::hard_link(staging, destination).map_err(|_| WalletError::WriteFailure)?;
        std::fs::remove_file(staging).map_err(|_| WalletError::WriteFailure)?;
    }
    Ok(())
}
