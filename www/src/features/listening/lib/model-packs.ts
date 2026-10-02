import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { isTauri } from "../../../platform/runtime";

/** A model pack's state on this device (spec 0001). */
export type PackState =
  | "absent"
  | "waiting"
  | "downloading"
  | "verifying"
  | "ready"
  | "updating"
  | "failed"
  | "no-space";

export interface PackStatus {
  id: string;
  kind: "voice" | "transcription";
  state: PackState;
  installedVersion: string | null;
  availableVersion: string | null;
  bytes: number | null;
  receivedBytes: number;
  reason: "network" | "checksum" | "server" | "no-space" | null;
  license: string | null;
  licenseUrl: string | null;
}

const STATUS_EVENT = "models://status";

export const modelPacksStatus = () => invoke<PackStatus[]>("models_status");
export const downloadPack = (id: string) => invoke<PackStatus>("models_download", { id });
export const deletePack = (id: string) => invoke<void>("models_delete", { id });
export const packLicense = (id: string) => invoke<string | null>("models_license", { id });

/** Starts the automatic downloads; outcomes arrive as status events. */
export const runAutoDownloads = (allowMetered: boolean) =>
  invoke<void>("models_auto", { allowMetered });

/** True when a newer version is listed than the one installed. */
export const updateAvailable = (pack: PackStatus) =>
  pack.installedVersion !== null &&
  pack.availableVersion !== null &&
  pack.availableVersion !== pack.installedVersion;

/** Every pack's status, kept live from `models://status`. Native apps only. */
export function useModelPacks(): PackStatus[] | null {
  const [packs, setPacks] = useState<PackStatus[] | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    void modelPacksStatus().then((all) => !cancelled && setPacks(all));
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const unlisten = await listen<PackStatus>(STATUS_EVENT, ({ payload }) => {
        setPacks((all) => all?.map((pack) => (pack.id === payload.id ? payload : pack)) ?? all);
      });
      if (cancelled) unlisten();
      else stop = unlisten;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return packs;
}
