import { Id } from "@notables/core";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ReaderPage } from "../../features/reader/components/reader-page";
import { getPublication } from "../../server/publications/publications.functions";

export const Route = createFileRoute("/p/$publicationId")({
  loader: async ({ params }) => {
    if (!Id.safeParse(params.publicationId).success) throw notFound();
    try {
      return await getPublication({ data: { id: params.publicationId } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            {
              title: `${loaderData.publication.title} — ${loaderData.publication.authorName} · Notables`,
            },
            { name: "description", content: loaderData.publication.excerpt },
            { property: "og:type", content: "article" },
            { property: "og:title", content: loaderData.publication.title },
            { property: "og:description", content: loaderData.publication.excerpt },
            { name: "twitter:card", content: "summary" },
          ],
        }
      : {},
  component: PublicationRoute,
});

function PublicationRoute() {
  const { publication, document } = Route.useLoaderData();
  return <ReaderPage publication={publication} document={document} />;
}
