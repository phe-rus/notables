import { type Drawing, type DrawingStudio, DrawingStudioProvider } from "@notables/editor";
import { AnimatePresence } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { loadScene, saveDrawing } from "../lib/scene-storage";
import { newScene, type PageScene, type PageSize, type PanelLayout } from "../model/page-scene";
import { StudioScreen } from "./studio-screen";

const LAST_PAGE_KEY = "notables:studio-page";

function lastPage(): { size: PageSize; layout: PanelLayout } {
  try {
    return {
      size: "manga",
      layout: "manga-5",
      ...JSON.parse(localStorage.getItem(LAST_PAGE_KEY) ?? "{}"),
    };
  } catch {
    return { size: "manga", layout: "manga-5" };
  }
}

interface Session {
  scene: PageScene;
  resolve: (drawing: Drawing | null) => void;
}

/**
 * Lets notes and chapters open the drawing studio. New pages start with
 * the shape and panels used last.
 */
export function StudioHost({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const studio = useMemo<DrawingStudio>(
    () => ({
      async open(ref) {
        const existing = ref ? await loadScene(ref) : null;
        const { size, layout } = lastPage();
        const scene = existing ?? newScene(size, layout);
        return new Promise<Drawing | null>((resolve) => setSession({ scene, resolve }));
      },
    }),
    [],
  );

  return (
    <DrawingStudioProvider studio={studio}>
      {children}
      <AnimatePresence>
        {session && (
          <StudioScreen
            initial={session.scene}
            onDone={async (scene) => {
              const drawing = await saveDrawing(scene);
              try {
                localStorage.setItem(
                  LAST_PAGE_KEY,
                  JSON.stringify({ size: scene.size, layout: scene.layout }),
                );
              } catch {
                // Not remembered.
              }
              session.resolve(drawing);
              setSession(null);
            }}
            onCancel={() => {
              session.resolve(null);
              setSession(null);
            }}
          />
        )}
      </AnimatePresence>
    </DrawingStudioProvider>
  );
}
