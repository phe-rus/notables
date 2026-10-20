import { invoke } from "@tauri-apps/api/core";
import { nativeCardTextSchema } from "../model/card-reader-contract";
import type { CardText } from "../model/types";

export async function readNativeCardText(canvas: HTMLCanvasElement): Promise<CardText> {
  const image = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  if (!image || image.length > 2_000_000) throw new Error("invalid-image");
  return nativeCardTextSchema.parse(
    await invoke<unknown>("plugin:card-reader|recognize", { image }),
  );
}

export const cancelNativeCardReading = () => invoke<void>("plugin:card-reader|cancel");
