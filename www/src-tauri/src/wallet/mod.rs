//! Isolated encrypted wallet storage. Native commands must supply an authenticated
//! data key before using this layer; it never obtains keys from note storage.

pub mod card;
pub mod commands;
pub mod crypto;
pub mod error;
pub mod keys;
pub mod session;
pub mod vault;
