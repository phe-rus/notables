# Widgets

Notables shows **Today at a glance**: the next plans from the calendar and
pinned notes, with a tap opening that place in the app.

## How it fits together

1. The app builds a small snapshot (`www/src/features/widgets/lib/widget-snapshot.ts`)
   whenever notes or plans change, and every 15 minutes. Its words are already
   in the app's language.
2. The Rust core saves it as `widgets/today.json` in the app's data folder
   (`src/widgets.rs`, command `widgets_publish`), replacing the file in one step.
3. Each platform's widget reads that file.

| Platform | Widget | Status |
| --- | --- | --- |
| macOS, Windows, Linux | Floating desktop widget (Settings › Widgets) | Built in and working |
| Android | Home-screen widget (`gen/android/.../widgets/TodayWidgetProvider.kt`) | Built in; Settings › Widgets › Add to Home Screen |
| iOS, iPadOS | WidgetKit widget (`apple/`) | Source ready; added to the Xcode project by hand |
| Web | Today page at `/widget` | Built in |

The Android project (`gen/android`) is in the repository, and the Android
widget lives in it. The iOS project (`gen/apple`) isn't yet, so its widget
sources wait here; they have not been compiled.

## Android

The provider (`TodayWidgetProvider.kt`) and its layout are in
`gen/android/app/src/main`, registered in the manifest. `MainActivity`
refreshes every widget when the app goes to the background; otherwise it
refreshes every 30 minutes, the shortest Android allows. Settings offers
the widget for the home screen through `requestPinAppWidget`
(`AndroidBridge.kt`). The widget reads the file the Rust core wrote,
checking the data folder layouts Tauri uses.

## iOS and iPadOS (iOS 17 or later)

After `bun tauri ios init`, in Xcode (`gen/apple/notables.xcodeproj`):

1. **File › New › Target › Widget Extension**, named `NotablesWidget`, without
   a configuration intent or Live Activity. Replace its generated Swift file
   with `apple/NotablesWidget/NotablesWidget.swift`.
2. Add `apple/Shared.swift` to **both** the app target and the widget target.
3. Add `apple/App/WidgetSnapshotSync.swift` to the app target, and call
   `WidgetSnapshotSync.shared.start()` once at launch.
4. On both targets, **Signing & Capabilities › + App Groups** and add
   `group.notables.pherus.org`.

Widgets can only read the shared App Group, so the app copies the snapshot
there whenever it goes to the background and asks iOS to redraw.

## macOS and Windows home widgets

The macOS Notification Center widgets and the Windows 11 Widgets board both
need app packaging the Tauri bundler doesn't produce yet: an embedded app
extension on macOS, and an MSIX package with a widget provider on Windows.
Until then the floating desktop widget covers both.
