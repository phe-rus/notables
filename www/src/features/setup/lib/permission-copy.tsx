import { BellIcon, MicIcon, ScanCodeIcon } from "@phe-rus/hino";
import { t } from "@/i18n/i18n";
import type { PermissionKind } from "@/platform/permissions";
import type { PermissionCopy } from "../model/types";

export const permissionCopy = (kind: PermissionKind): PermissionCopy =>
  ({
    microphone: {
      title: t("setup.microphone"),
      body: t("setup.microphoneBody"),
      icon: <MicIcon size={20} />,
    },
    camera: {
      title: t("setup.camera"),
      body: t("setup.cameraBody"),
      icon: <ScanCodeIcon size={20} />,
    },
    notifications: {
      title: t("setup.notifications"),
      body: t("setup.notificationsBody"),
      icon: <BellIcon size={20} />,
    },
  })[kind];
