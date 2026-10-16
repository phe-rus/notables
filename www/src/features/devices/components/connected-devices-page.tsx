import { confirmDialog, LabeledContent, Section } from "@phe-rus/hino";
import { Button } from "@phe-rus/hino/button";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { thisDeviceName } from "../../../platform/session/this-device";
import { useSpace } from "../../../platform/space/space-identity";
import { useSpaceDevices } from "../../../platform/space/space-sync";
import { disconnectThisDevice } from "../lib/disconnect-device";
import { readLinkUrl } from "../lib/link-url";
import { LinkBrowserSheet, type LinkTarget } from "./link-browser-sheet";
import { LinkDeviceSheet } from "./link-device-sheet";

/** Native devices share a space; browsers have their own Settings page. */
export function ConnectedDevicesPage() {
  const space = useSpace();
  const devices = useSpaceDevices();
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

  const disconnect = async () => {
    if (
      !(await confirmDialog({
        title: t("devices.disconnectTitle"),
        message: t("devices.disconnectBody"),
        confirmLabel: t("devices.disconnect"),
        destructive: true,
      }))
    )
      return;
    setBusy(true);
    setError(false);
    try {
      await disconnectThisDevice();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section title={t("devices.thisDevice")} footer={t("devices.devicesFooter")}>
        <LabeledContent label={thisDeviceName()} stacked>
          <Button
            variant="ghost"
            className="text-danger"
            disabled={!space || busy}
            onClick={() => void disconnect()}
          >
            {t("devices.disconnect")}
          </Button>
        </LabeledContent>
        {error && (
          <p role="alert" className="px-4 py-2 text-footnote text-danger">
            {t("devices.disconnectFailed")}
          </p>
        )}
      </Section>
      <Section title={t("devices.connectedTitle")}>
        {devices.map((device) => (
          <LabeledContent key={device.id} label={device.name} description={t("devices.online")}>
            {null}
          </LabeledContent>
        ))}
        {devices.length === 0 && (
          <p className="px-4 py-3 text-subheadline text-label-secondary">
            {t("devices.noDevices")}
          </p>
        )}
      </Section>
      <Section footer={t("devices.linkOnce")}>
        <LabeledContent label={t("devices.addDeviceWhere")} stacked>
          <Button
            variant="secondary"
            className="w-full"
            disabled={!space || busy}
            onClick={() => setAdding(true)}
          >
            {t("devices.addDevice")}
          </Button>
        </LabeledContent>
        <LabeledContent label={t("devices.joinWhere")} stacked>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => setJoining(true)}
          >
            {t("devices.joinTitle")}
          </Button>
        </LabeledContent>
        {!space && (
          <p role="status" className="px-4 py-2 text-footnote text-label-secondary">
            {t("devices.identityUnavailable")}
          </p>
        )}
      </Section>
      <LinkBrowserSheet
        open={adding}
        initial={target}
        onClose={() => {
          setAdding(false);
          setTarget(null);
        }}
        title={t("devices.addDevice")}
        kind="device"
      />
      <LinkDeviceSheet open={joining} onClose={() => setJoining(false)} />
    </>
  );
}
