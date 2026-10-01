import { createFileRoute } from "@tanstack/react-router";
import { NoteScreen } from "../../../features/notes/note-screen";

export const Route = createFileRoute("/_app/notes/$noteId")({
  component: NoteRoute,
});

function NoteRoute() {
  const { noteId } = Route.useParams();
  const { view } = Route.useSearch();
  return <NoteScreen noteId={noteId} viewId={view} />;
}
