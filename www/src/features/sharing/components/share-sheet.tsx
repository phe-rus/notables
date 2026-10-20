import {
  Button,
  CheckIcon,
  CloseIcon,
  cn,
  confirmDialog,
  IconButton,
  LinkIcon,
  QrCodeGlyph,
  ShareIcon,
  Sheet,
  toast,
} from "@phe-rus/hino";
import { useEffect, useState } from "react";
import { SealCode } from "@/features/invoices/components/seal-code";
import type { LibraryEntry } from "@/features/library/store/library-store";
import { t } from "@/i18n/i18n";
import { useAuthorName } from "@/platform/author-preferences";
import { inBrowserSession } from "@/platform/session/browser-session-store";
import { phoneConnection } from "@/platform/session/phone-connection";
import { handOver } from "../lib/hand-over";
import {
  invitePerson,
  linkFor,
  removePerson,
  startSharing,
  stopSharing,
} from "../lib/share-actions";
import { membersOf } from "../lib/share-members";
import { useShareSession } from "../lib/share-sessions";
import { BrowserShareStatus } from "../model/browser-share";
import { OWNER, type ShareMember } from "../model/share";
import { useShares } from "../store/share-store";

/**
 * Share a note with specific people. Each person gets their own link;
 * devices then sync directly with each other, end to end encrypted.
 */
export function ShareSheet({
  entry,
  open,
  onClose,
}: {
  entry: LibraryEntry;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={t("sharing.title")} className="max-w-[480px]">
      <ShareContent entry={entry} onClose={onClose} />
    </Sheet>
  );
}

function ShareContent({ entry, onClose }: { entry: LibraryEntry; onClose: () => void }) {
  const browser = inBrowserSession();
  const [remote, setRemote] = useState<BrowserShareStatus | null>(null);
  const share = useShares().find((item) => item.noteId === entry.id);
  const session = useShareSession(entry.id);
  const authorName = useAuthorName();
  const [name, setName] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [qr, setQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<Array<[string, ShareMember]>>([]);

  // The people list lives in the note itself; follow it as it changes.
  useEffect(() => {
    if (!session) {
      setMembers([]);
      return;
    }
    const map = membersOf(session.doc);
    const read = () => setMembers([...map.entries()].filter(([, member]) => !member.revokedAt));
    void session.ready.then(read);
    map.observe(read);
    return () => map.unobserve(read);
  }, [session]);

  useEffect(() => {
    if (!browser) return;
    let active = true;
    const refresh = async () => {
      try {
        const result = await phoneConnection()?.client.request("sharing.status", {
          noteId: entry.id,
        });
        const status = BrowserShareStatus.parse(result);
        if (active) setRemote(status);
      } catch {}
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [browser, entry.id]);
  const online = new Set(browser ? remote?.online : session?.peers.map((peer) => peer.inviteId));
  const owner = browser ? remote?.role === "owner" : share?.role === "owner";
  const canInvite = browser ? remote?.role !== "member" : owner || !share;
  const shared = browser
    ? remote?.role !== undefined && remote.role !== "unshared"
    : Boolean(share);
  const mine = browser ? remote?.mine : share?.inviteId;
  const people = browser ? (remote?.members ?? []) : members;

  const invite = async () => {
    const person = name.trim();
    if (!person) return;
    setBusy(true);
    try {
      if (!share) startSharing(entry, authorName);
      const link = await invitePerson(entry, person);
      setName("");
      await handOver(link, entry.title || t("common.untitled"));
    } catch (error) {
      toast.error(t("sharing.couldNotInvite"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const shareLink = async (mode: "copy" | "qr" | "system") => {
    setBusy(true);
    try {
      if (!share) startSharing(entry, authorName);
      const link =
        generated ?? (await invitePerson(entry, name.trim() || t("sharing.linkRecipient")));
      setGenerated(link);
      if (mode === "qr") setQr(!qr);
      else if (mode === "system") await handOver(link, entry.title || t("common.untitled"));
      else {
        await navigator.clipboard.writeText(link);
        toast.success(t("sharing.linkCopied"));
      }
    } catch {
      toast.error(t("sharing.couldNotInvite"));
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    const confirmed = await confirmDialog({
      title: owner ? t("sharing.stopTitle") : t("sharing.leaveTitle"),
      message: owner ? t("sharing.stopBody") : t("sharing.leaveBody"),
      confirmLabel: owner ? t("sharing.stop") : t("sharing.leave"),
      destructive: true,
    });
    if (!confirmed) return;
    await stopSharing(entry.id);
    onClose();
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-title3 font-bold tracking-tight">{t("sharing.title")}</h2>
          <p className="text-footnote leading-snug text-label-secondary">
            {t("sharing.explainer")}
          </p>
        </div>
        <IconButton size="icon-sm" variant="ghost" label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>

      <div className="flex grow flex-col gap-5 overflow-y-auto px-6 pt-3 pb-6">
        {canInvite && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-1 text-caption"
                disabled={busy}
                onClick={() => void shareLink("copy")}
              >
                <LinkIcon size={17} />
                {t("sharing.copyInvitation")}
              </Button>
              <Button
                variant="secondary"
                className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-1 text-caption"
                disabled={busy}
                onClick={() => void shareLink("qr")}
              >
                <QrCodeGlyph size={17} />
                {t("sharing.scanCode")}
              </Button>
              <Button
                variant="secondary"
                className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-1 text-caption"
                disabled={busy}
                onClick={() => void shareLink("system")}
              >
                <ShareIcon size={17} />
                {t("sharing.systemShare")}
              </Button>
            </div>
            {qr && generated && (
              <div className="mx-auto rounded-3xl bg-white p-4">
                <SealCode value={generated} size={232} />
              </div>
            )}
          </>
        )}
        {canInvite && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void invite();
            }}
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("sharing.personPlaceholder")}
              aria-label={t("sharing.personPlaceholder")}
              maxLength={60}
              className="min-w-0 grow rounded-xl control-field px-3.5 py-2.5 text-subheadline text-label placeholder:text-label-tertiary"
            />
            <Button variant="default" type="submit" disabled={busy || !name.trim()}>
              <ShareIcon size={16} />
              {t("sharing.invite")}
            </Button>
          </form>
        )}

        {people.length > 0 && (
          <section className="flex flex-col gap-1.5" aria-label={t("sharing.people")}>
            <h3 className="text-caption font-semibold tracking-wide text-label-tertiary uppercase">
              {t("sharing.people")}
            </h3>
            <ul className="flex flex-col divide-y divide-separator/60 overflow-hidden rounded-3xl border border-separator/60 bg-elevated">
              {people.map(([inviteId, member]) => {
                const here = online.has(inviteId) || inviteId === mine;
                const isMe = inviteId === mine;
                return (
                  <li key={inviteId} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "relative flex size-9 shrink-0 items-center justify-center rounded-full text-subheadline font-semibold",
                        inviteId === OWNER ? "bg-accent text-on-accent" : "bg-fill text-label",
                      )}
                    >
                      {member.name.trim().charAt(0).toUpperCase() || "?"}
                      {here && (
                        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-elevated bg-success" />
                      )}
                    </span>
                    <span className="flex min-w-0 grow flex-col">
                      <span className="truncate text-subheadline font-medium">
                        {isMe ? t("sharing.you", { name: member.name }) : member.name}
                      </span>
                      <span className="text-caption text-label-secondary">
                        {inviteId === OWNER
                          ? t("sharing.owner")
                          : here
                            ? t("sharing.online")
                            : member.joinedAt
                              ? t("sharing.joined")
                              : t("sharing.invited")}
                      </span>
                    </span>
                    {owner && inviteId !== OWNER && (
                      <>
                        {!member.joinedAt && (
                          <IconButton
                            size="icon-sm"
                            variant="ghost"
                            label={t("sharing.copyLink")}
                            onClick={() => {
                              void (async () => {
                                const link = browser
                                  ? await phoneConnection()?.client.request("sharing.link", {
                                      noteId: entry.id,
                                      inviteId,
                                    })
                                  : linkFor(entry, inviteId);
                                if (typeof link === "string")
                                  await handOver(link, entry.title || t("common.untitled"));
                              })().catch(() => toast.error(t("sharing.couldNotInvite")));
                            }}
                          >
                            <LinkIcon size={17} />
                          </IconButton>
                        )}
                        <IconButton
                          size="icon-sm"
                          variant="ghost"
                          label={t("sharing.remove", { name: member.name })}
                          onClick={() =>
                            void Promise.resolve(removePerson(entry.id, inviteId)).catch(() =>
                              toast.error(t("sharing.couldNotInvite")),
                            )
                          }
                        >
                          <CloseIcon size={16} />
                        </IconButton>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <ul className="flex flex-col gap-2 text-footnote leading-snug text-label-secondary">
          {[t("sharing.pointDirect"), t("sharing.pointEncrypted"), t("sharing.pointOnline")].map(
            (point) => (
              <li key={point} className="flex gap-2">
                <CheckIcon size={14} strokeWidth={2.6} className="mt-0.5 shrink-0 text-success" />
                {point}
              </li>
            ),
          )}
        </ul>
      </div>

      {shared && (
        <footer className="flex justify-between gap-2 border-t border-separator/60 px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => void stop()}
            className="text-subheadline font-medium text-danger"
          >
            {owner ? t("sharing.stop") : t("sharing.leave")}
          </button>
          <Button variant="secondary" onClick={onClose}>
            {t("common.done")}
          </Button>
        </footer>
      )}
    </>
  );
}
