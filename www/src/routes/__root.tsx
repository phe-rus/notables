import { MediaResolverProvider } from "@notables/editor";
import { ContextMenuHost, DialogHost, Toaster, TooltipHost } from "@notables/ui";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { AppLinkListener } from "../components/app-links/app-link-listener";
import { resolveMediaUrl } from "../platform/storage/media-store";
import { startWindowFrame } from "../platform/window-frame";
import styles from "../styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "color-scheme", content: "light dark" },
      { name: "theme-color", content: "#f3efe6", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#121110", media: "(prefers-color-scheme: dark)" },
      { title: "Notables" },
      {
        name: "description",
        content: "Write, draw, record and publish notes, journals, stories and books.",
      },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  useEffect(startWindowFrame, []);
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Respect the system's Reduce Motion setting everywhere. */}
        <MotionConfig reducedMotion="user">
          {/* Recordings and photos stored on this device play from local URLs. */}
          <MediaResolverProvider resolve={resolveMediaUrl}>{children}</MediaResolverProvider>
          <Toaster />
          <DialogHost />
          <TooltipHost />
          <ContextMenuHost />
          <AppLinkListener />
        </MotionConfig>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-3 bg-paper p-8 text-center">
      <h1 className="font-serif text-[32px] font-semibold">Nothing here</h1>
      <p className="text-label-secondary">This page doesn’t exist, or it was unpublished.</p>
      <a href="/" className="font-semibold text-accent-text">
        Back to your notes
      </a>
    </main>
  );
}
