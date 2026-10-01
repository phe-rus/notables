/** Classic macOS window controls, shown only in the desktop shell. */
export function WindowControls() {
  return (
    <div className="flex gap-2 px-2" aria-hidden="true">
      <span className="size-3 rounded-full bg-[#ff5f57]" />
      <span className="size-3 rounded-full bg-[#febc2e]" />
      <span className="size-3 rounded-full bg-[#28c840]" />
    </div>
  );
}
