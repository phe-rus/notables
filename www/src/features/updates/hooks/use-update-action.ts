import { useState } from "react";
import { openExternalUrl } from "@/platform/external-links";
import { updateDestinations } from "../model/constants";
import type { UpdateAction } from "../model/types";
import { appUpdateStore } from "../store/app-update-store";

export function useUpdateAction(): UpdateAction {
  const [openFailed, setOpenFailed] = useState(false);
  const update = async () => {
    const installed = appUpdateStore.getState().installed;
    if (!installed) return;
    setOpenFailed(false);
    try {
      await openExternalUrl(updateDestinations[installed.channel]);
    } catch {
      setOpenFailed(true);
    }
  };
  return { openFailed, update };
}
