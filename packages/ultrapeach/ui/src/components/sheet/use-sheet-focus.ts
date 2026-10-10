import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ownsFloatingLayer } from "../../lib/floating-layers";
import { enterModalEnvironment } from "./modal-environment";

const sheets: HTMLElement[] = [];
const focusableSelector = [
  "a[href]",
  "button",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "[tabindex]",
  "[contenteditable=true]",
].join(",");

function focusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      !element.closest("[inert]") &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden",
  );
}

/** Keeps keyboard focus in the foremost sheet, including its floating pickers. */
export function useSheetFocus(panel: RefObject<HTMLDivElement | null>, onClose: () => void) {
  // Capture before children mount, since a child may use autoFocus.
  const [opener] = useState(() =>
    typeof document === "undefined" ? null : document.activeElement,
  );
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    const surface = panel.current;
    if (!surface) return;
    sheets.push(surface);
    const foremost = () => sheets.at(-1) === surface;
    const focusFirst = () => (focusableElements(surface)[0] ?? surface).focus();
    const inFloatingLayer = (element: Element | null) => ownsFloatingLayer(surface, element);
    const belongsToSheet = (element: Element | null) =>
      surface.contains(element) || inFloatingLayer(element);

    if (!surface.contains(document.activeElement)) focusFirst();
    const leaveModalEnvironment = enterModalEnvironment(surface);

    const onFocus = (event: FocusEvent) => {
      if (foremost() && !belongsToSheet(event.target as Element | null)) focusFirst();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!foremost() || event.defaultPrevented) return;
      if (event.key === "Escape") {
        // Floating controls handle their own Escape before the sheet.
        if (inFloatingLayer(document.activeElement)) return;
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key !== "Tab") return;
      const controls = focusableElements(surface);
      const first = controls[0] ?? surface;
      const last = controls.at(-1) ?? surface;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !surface.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !surface.contains(active) || active === surface)
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("focusin", onFocus);
    window.addEventListener("keydown", onKey);
    return () => {
      const wasForemost = foremost();
      sheets.splice(sheets.indexOf(surface), 1);
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("keydown", onKey);
      leaveModalEnvironment();
      if (wasForemost && opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [panel, opener]);
}
