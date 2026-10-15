import { spring } from "@phe-rus/hino";
import { AnimatePresence, motion } from "motion/react";
import { t } from "../../../i18n/i18n";
import { type PhoneStatus, usePhoneStatus } from "../../../platform/session/phone-connection";

export function phoneStatusText(status: PhoneStatus): string {
  switch (status) {
    case "connected":
      return t("devices.connected");
    case "connecting":
      return t("devices.connectingPhone");
    case "phone-away":
      return t("devices.phoneAway");
    case "other-network":
      return t("devices.otherNetwork");
    case "ended":
      return t("devices.ended");
  }
}

/**
 * In a browser, says when the phone isn't there and what to do about it
 * (spec 0005, AC-26). Hidden while connected.
 */
export function PhoneStatusBanner() {
  const status = usePhoneStatus();
  const shown = status !== null && status !== "connected";
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={spring.smooth}
          className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4"
        >
          <p className="pointer-events-auto rounded-full bg-label px-4 py-2 text-footnote font-medium text-paper shadow-lg">
            {phoneStatusText(status)}
            {status === "ended" && (
              <a href="/link" className="ms-2 font-semibold underline">
                {t("devices.linkAgain")}
              </a>
            )}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
