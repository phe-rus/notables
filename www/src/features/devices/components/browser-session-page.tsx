import { Button, confirmDialog, LabeledContent, Section } from "@phe-rus/hino";
import { t } from "../../../i18n/i18n";
import { browserSession } from "../../../platform/session/browser-session-store";
import { phoneConnection, usePhoneStatus } from "../../../platform/session/phone-connection";
import { phoneStatusText } from "./phone-status-banner";
import { SpaceIdSection } from "./space-id-section";

/** Settings > Linked Devices in a browser: which phone it shows, and Log Out. */
export function BrowserSessionPage() {
  const session = browserSession();
  const status = usePhoneStatus();
  if (!session) return null;

  const logOut = async () => {
    const confirmed = await confirmDialog({
      title: t("devices.logOutTitle"),
      message: t("devices.logOutBody"),
      confirmLabel: t("devices.logOut"),
      destructive: true,
    });
    if (!confirmed) return;
    phoneConnection()?.logOut();
    window.location.assign("/link");
  };

  return (
    <>
      <SpaceIdSection />
      <Section title={t("devices.linkedTo")} footer={t("devices.nothingStored")}>
        <LabeledContent
          label={session.phoneName}
          description={status ? phoneStatusText(status) : undefined}
        >
          <Button variant="ghost" onClick={() => void logOut()}>
            {t("devices.logOut")}
          </Button>
        </LabeledContent>
      </Section>
    </>
  );
}
