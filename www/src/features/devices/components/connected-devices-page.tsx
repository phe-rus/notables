import {
  confirmDialog,
  IconButton,
  LayoutIcon,
  LinkIcon,
  MoreIcon,
  openMenu,
  PlusIcon,
  QrCodeGlyph,
  Section,
} from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { ago } from "../../../lib/time/relative-time";
import { thisDeviceName } from "../../../platform/session/this-device";
import { useSpace } from "../../../platform/space/space-identity";
import {
  devicesWithoutKey,
  dismissRemovedNotice,
  removeDevice,
  useRemovedNotice,
} from "../../../platform/space/space-removal";
import { type SpaceDevice, useSpaceDevices } from "../../../platform/space/space-sync";
import { SettingsToolbarAction } from "../../settings/components/settings-toolbar";
import { useBrowserSessions, useLiveBrowsers } from "../lib/browser-sessions";
import { readLinkUrl } from "../lib/link-url";
import { LinkBrowserSheet, type LinkTarget } from "./link-browser-sheet";
import { LinkDeviceSheet } from "./link-device-sheet";

/** Native devices share a space; browsers have their own Settings page. */
export function ConnectedDevicesPage() {
  const space = useSpace();
  const devices = useSpaceDevices();
  const removed = useRemovedNotice();
  const sessions = useBrowserSessions();
  const liveBrowsers = useLiveBrowsers();
  const [adding, setAdding] = useState(false);
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [target, setTarget] = useState<LinkTarget | null>(null);
  useEffect(() => {
    const link = new URLSearchParams(window.location.search).get("link");
    const scanned = link ? readLinkUrl(link) : null;
    if (scanned) {
      setTarget(scanned);
      setAdding(true);
    }
  }, []);

  // Disconnects another device: it keeps what it has, the rest move to a new key (AC-12).
  const disconnect = async (device: SpaceDevice) => {
    const missing = devicesWithoutKey(device.id);
    const body = t("devices.disconnectBody", { name: device.name });
    if (
      !(await confirmDialog({
        title: t("devices.disconnectTitle", { name: device.name }),
        message: missing.length
          ? `${body} ${t("devices.disconnectRelink", { names: missing.join(", ") })}`
          : body,
        confirmLabel: t("devices.disconnect"),
        destructive: true,
      }))
    )
      return;
    setBusy(true);
    setError(false);
    try {
      await removeDevice(device.id);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsToolbarAction>
        <IconButton
          size="icon-sm"
          label={t("devices.addDevice")}
          disabled={busy}
          onClick={(event) =>
            openMenu(
              event.currentTarget,
              [
                {
                  label: t("devices.scanOrEnter"),
                  icon: <QrCodeGlyph size={18} />,
                  onSelect: () => setAdding(true),
                },
                {
                  label: t("devices.showCode"),
                  icon: <LayoutIcon size={18} />,
                  onSelect: () => setJoining(true),
                },
              ],
              { edge: "trailing" },
            )
          }
        >
          <PlusIcon size={16} />
        </IconButton>
      </SettingsToolbarAction>
      {removed && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl bg-danger/8 px-4 py-3 text-footnote"
        >
          <span className="grow">
            <span className="block font-semibold text-danger">{t("devices.removedTitle")}</span>
            <span className="text-label-secondary">{t("devices.removedBody")}</span>
          </span>
          <Button size="sm" variant="ghost" onClick={dismissRemovedNotice}>
            {t("common.done")}
          </Button>
        </div>
      )}
      <Section>
        <div className="flex min-h-14 items-center gap-3 px-4 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <LayoutIcon size={18} />
          </span>
          <span className="min-w-0 grow">
            <span className="block truncate text-subheadline font-medium">{thisDeviceName()}</span>
            <span className="text-caption text-label-secondary">{t("devices.currentDevice")}</span>
          </span>
        </div>
        {devices.map((device) => (
          <div key={device.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-fill text-label-secondary">
              <LayoutIcon size={18} />
            </span>
            <span className="min-w-0 grow">
              <span className="block truncate text-subheadline font-medium">{device.name}</span>
              <span className="text-caption text-label-secondary">
                {t("devices.syncedDevice")} ·{" "}
                {device.online
                  ? t("devices.online")
                  : t("devices.lastActive", { when: ago(device.lastSeen) })}
              </span>
            </span>
            <span
              role="img"
              aria-label={device.online ? t("devices.online") : t("devices.offline")}
              className={
                device.online
                  ? "size-2 shrink-0 rounded-full bg-success"
                  : "size-2 shrink-0 rounded-full bg-fill"
              }
            />
            <IconButton
              variant="ghost"
              size="icon-xs"
              label={t("notes.more")}
              disabled={busy || !space}
              onClick={(event) =>
                openMenu(
                  event.currentTarget,
                  [
                    {
                      label: t("devices.disconnect"),
                      destructive: true,
                      onSelect: () => void disconnect(device),
                    },
                  ],
                  { edge: "trailing" },
                )
              }
            >
              <MoreIcon size={17} />
            </IconButton>
          </div>
        ))}
        {devices.length === 0 && (
          <p className="px-4 py-3 text-footnote text-label-secondary">
            {t("devices.noLinkedDevices")}
          </p>
        )}
      </Section>
      {error && (
        <p role="alert" className="px-1 text-footnote text-danger">
          {t("devices.disconnectFailed")}
        </p>
      )}
      {!space && (
        <p role="status" className="px-1 text-footnote text-label-secondary">
          {t("devices.identityUnavailable")}
        </p>
      )}
      <Section footer={t("devices.browserListHint")}>
        <Link
          to="/settings/$page"
          params={{ page: "devices" }}
          className="flex min-h-12 items-center gap-3 px-4 py-2 text-subheadline text-label no-underline hover:bg-fill/50"
        >
          <LinkIcon size={18} className="shrink-0 text-accent-text" />
          <span className="grow">{t("devices.browsers")}</span>
          <span className="text-caption tabular-nums text-label-secondary">
            {t("devices.browserCount", { online: liveBrowsers.size, total: sessions.length })}
          </span>
        </Link>
      </Section>
      <LinkBrowserSheet
        open={adding}
        initial={target}
        onClose={() => {
          setAdding(false);
          setTarget(null);
        }}
        title={t("devices.scanOrEnter")}
        kind="device"
      />
      <LinkDeviceSheet open={joining} onClose={() => setJoining(false)} />
    </>
  );
}
