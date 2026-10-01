import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/books/")({
  component: NoBookSelected,
});

function NoBookSelected() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="font-serif text-[26px] font-semibold text-label">
        Every note can become a chapter.
      </p>
      <p className="text-[15px] text-label-secondary">Pick a book, or start a new one.</p>
    </div>
  );
}
