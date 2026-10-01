import { createFileRoute } from "@tanstack/react-router";
import { BookScreen } from "../../../features/books/components/book-screen";

export const Route = createFileRoute("/_app/books/$bookId")({
  component: BookRoute,
});

function BookRoute() {
  const { bookId } = Route.useParams();
  return <BookScreen key={bookId} bookId={bookId} />;
}
