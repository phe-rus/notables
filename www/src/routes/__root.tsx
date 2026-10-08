import { MediaResolverProvider } from "@notables/pluraliti";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { ContextMenuHost, DialogHost, Toaster, TooltipHost } from "@ultrapeach/ui";
import { MotionConfig } from "motion/react";
import { Fragment, type ReactNode, useEffect } from "react";
import { AppLinkListener } from "../components/app-links/app-link-listener";
import { SplashScreen } from "../components/splash/splash-screen";
import { ListeningSession } from "../features/listening/components/listening-session";
import { appearanceBootScript } from "../features/settings/lib/appearance-boot";
import { useLanguage } from "../i18n/i18n";
import { languages } from "../i18n/languages";
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Shared pages and document checks open instantly, without the app's splash.
  const publicPage = pathname.startsWith("/p/") || pathname.startsWith("/verify");
  // The desktop widget is its own small window; the app's services run in the main one.
  const widget = pathname === "/widget";
  const language = useLanguage();
  const direction = languages.find((entry) => entry.id === language)?.dir ?? "ltr";
  return (
    <html lang={language} dir={direction} suppressHydrationWarning>
      <head>
        {/* Saved theme, accent and text size before the first paint: no flash of the wrong look. */}
        <script dangerouslySetInnerHTML={{ __html: appearanceBootScript }} />
        <HeadContent />
      </head>
      <body>
        {/* Respect the system's Reduce Motion setting everywhere. */}
        <MotionConfig reducedMotion="user">
          {/* Recordings and photos stored on this device play from local URLs. */}
          <MediaResolverProvider resolve={resolveMediaUrl}>
            {/* A new language redraws every screen in it. */}
            <Fragment key={language}>{children}</Fragment>
            {/* Audiobooks keep playing from page to page. */}
            {!widget && <ListeningSession />}
          </MediaResolverProvider>
          <Toaster />
          <DialogHost />
          <TooltipHost />
          <ContextMenuHost />
          {!publicPage && !widget && <SplashScreen />}
          {!widget && <AppLinkListener />}
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
