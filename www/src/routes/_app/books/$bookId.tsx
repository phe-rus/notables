import { createFileRoute, Link } from "@tanstack/react-router";
import { BookScreen } from "../../../features/books/components/book-screen";

export const Route = createFileRoute("/_app/books/$bookId")({
  component: BookRoute,
});

function BookRoute() {
  const { bookId } = Route.useParams();
  return (
    <BookScreen
      key={bookId}
      bookId={bookId}
      actions={
        <Link
          to="/read/$bookId"
          params={{ bookId }}
          className="inline-flex h-[34px] items-center rounded-full bg-inverse px-4 text-[14px] font-semibold text-on-inverse no-underline transition-transform active:scale-[0.97]"
        >
          Read
        </Link>
      }
    />
  );
}
