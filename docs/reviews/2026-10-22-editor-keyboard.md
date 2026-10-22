# Editor keyboard and title correction, 22 October 2026

The note title now leads beside Back, replacing the old folder-label position.

On the TECNO, before the fix, both the pane and visual viewport measured
517 pixels high with the keyboard visible, but the toolbar retained a
263-pixel bottom offset. Its bottom was 254 instead of near the viewport edge.
The shell and the editor hook measured during the same viewport change; the
hook kept its measurement from before the shell resized.

The hook attaches through a mount callback because the note renders only after
its document provider loads. It observes pane resizing and measures after layout, in addition to
viewport resize and pan events. It removes the observer and animation frame on
unmount. The pane remains the toolbar's positioning container.

Checks: frozen installation, lint, all TypeScript checks and tests, web build,
Worker smoke, native frontend build, Rust formatting, Clippy and library tests
passed. The separate TECNO debug build is used for physical verification.
Physical TECNO check: the synthetic note "Keyboard_check_22_October" opened
with the keyboard, viewport and pane both 517 pixels high. The toolbar occupied
453 through 505, leaving 12 pixels above the keyboard. After dismissal it returned
to 756 through 808 in the 820-pixel viewport. The title uses leading alignment.

Physical iPhone verification remains pending; Android evidence does not prove
Safari keyboard behavior.

Next: toolbar-consuming menu expansion, smaller folder actions, Calendar date
previews, and responsive Settings layouts. The v0.2.16 Android, iOS, Linux and
Windows jobs all completed successfully before this correction.
