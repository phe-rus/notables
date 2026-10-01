import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: NoNoteSelected,
});

function NoNoteSelected() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="font-serif text-[26px] font-semibold text-label">
        Every story starts somewhere.
      </p>
      <p className="text-[15px] text-label-secondary">
        Pick a note, or press the pen to start a new one.
      </p>
    </div>
  );
}
