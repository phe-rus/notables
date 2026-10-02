import { createContext, type ReactNode, useContext } from "react";

/** A finished drawing: the rendered page and the scene it can be edited from. */
export interface Drawing {
  /** The rendered image, usually `media:<id>`. */
  src: string;
  /** The editable scene, usually `media:<id>` of its JSON. */
  scene: string;
}

/**
 * Opens a full drawing canvas for comic, manga and picture-book pages.
 * Apps provide it; without a provider, images can't be drawn or redrawn.
 * Resolves with the drawing, or null when cancelled.
 */
export interface DrawingStudio {
  open(scene: string | null): Promise<Drawing | null>;
}

const DrawingStudioContext = createContext<DrawingStudio | null>(null);

export function DrawingStudioProvider({
  studio,
  children,
}: {
  studio: DrawingStudio | null;
  children: ReactNode;
}) {
  return <DrawingStudioContext.Provider value={studio}>{children}</DrawingStudioContext.Provider>;
}

export function useDrawingStudio(): DrawingStudio | null {
  return useContext(DrawingStudioContext);
}
