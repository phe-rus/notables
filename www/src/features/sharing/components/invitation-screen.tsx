import { useNavigate } from "@tanstack/react-router";
import { Button, ShareIcon } from "@ultrapeach/ui";
import { useEffect, useMemo, useState } from "react";
import { AppMark } from "../../../components/brand/app-mark";
import { t } from "../../../i18n/i18n";
import { markAppReady } from "../../../platform/app-ready";
import { useLibraryReady } from "../../library/store/library-store";
import { readInvitation } from "../lib/invite-link";
import { acceptInvitation } from "../lib/share-actions";

/**
 * Where an invitation link lands: who shared what, and one button to add
 * it. Nothing is downloaded from a server; the note arrives from the
 * sharer's device once both are online.
 */
export function InvitationScreen({ shareId }: { shareId: string }) {
  const navigate = useNavigate();
  const ready = useLibraryReady();
  const [hash] = useState(() => (typeof window === "undefined" ? "" : window.location.hash));
  const invitation = useMemo(() => readInvitation(shareId, hash), [shareId, hash]);

  useEffect(() => markAppReady(), []);

  const accept = () => {
    if (!invitation) return;
    const entry = acceptInvitation(invitation);
    // Drop the secrets from the address bar and history.
    window.history.replaceState(null, "", window.location.pathname);
    void navigate({ to: "/notes/$noteId", params: { noteId: entry.id }, replace: true });
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <AppMark size={64} />
      {invitation ? (
        <>
          <div className="flex max-w-[420px] flex-col gap-2">
            <p className="text-[14px] font-medium text-label-secondary">
              {t("sharing.invitedBy", { name: invitation.from || t("calendar.someone") })}
            </p>
            <h1 className="font-serif text-[30px] leading-tight font-semibold">
              {invitation.title || t("common.untitled")}
            </h1>
            <p className="text-subheadline leading-snug text-label-secondary">
              {t("sharing.acceptBody")}
            </p>
          </div>
          <Button variant="primary" size="md" disabled={!ready} onClick={accept}>
            <ShareIcon size={17} />
            {t("sharing.accept")}
          </Button>
          {invitation.name && (
            <p className="text-caption text-label-tertiary">
              {t("sharing.joiningAs", { name: invitation.name })}
            </p>
          )}
        </>
      ) : (
        <div className="flex max-w-[380px] flex-col gap-2">
          <h1 className="text-title2 font-semibold">{t("sharing.badLinkTitle")}</h1>
          <p className="text-subheadline text-label-secondary">{t("sharing.badLinkBody")}</p>
        </div>
      )}
    </main>
  );
}
