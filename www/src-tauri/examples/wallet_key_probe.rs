use notables_lib::wallet::keys::{DeviceKeyStore, KeyStore};

fn main() {
    match DeviceKeyStore.probe() {
        Ok(()) => println!("Wallet device key write, read and cleanup passed."),
        Err(error) => {
            eprintln!("Wallet device key probe: {error}");
            std::process::exit(1);
        }
    }
}
