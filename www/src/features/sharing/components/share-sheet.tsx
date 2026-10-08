import {
  Button,
  CheckIcon,
  CloseIcon,
  cn,
  confirmDialog,
  IconButton,
  LinkIcon,
  ShareIcon,
  Sheet,
  toast,
} from "@ultrapeach/ui";
import { useEffect, useState } from "react";
import { t } from "../../../i18n/i18n";
import { useAuthorName } from "../../../platform/author-preferences";
import type { LibraryEntry } from "../../library/store/library-store";
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
  const share = useShares().find((item) => item.noteId === entry.id);
  const session = useShareSession(entry.id);
  const authorName = useAuthorName();
  const [name, setName] = useState("");
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

  const online = new Set(session?.peers.map((peer) => peer.inviteId));
  const owner = share?.role === "owner";

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
        <IconButton label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>

      <div className="flex grow flex-col gap-5 overflow-y-auto px-6 pt-3 pb-6">
        {(owner || !share) && (
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
            <Button variant="primary" type="submit" disabled={busy || !name.trim()}>
              <ShareIcon size={16} />
              {t("sharing.invite")}
            </Button>
          </form>
        )}

        {members.length > 0 && (
          <section className="flex flex-col gap-1.5" aria-label={t("sharing.people")}>
            <h3 className="text-caption font-semibold tracking-wide text-label-tertiary uppercase">
              {t("sharing.people")}
            </h3>
            <ul className="flex flex-col divide-y divide-separator/60 overflow-hidden rounded-3xl border border-separator/60 bg-elevated">
              {members.map(([inviteId, member]) => {
                const here = online.has(inviteId) || inviteId === share?.inviteId;
                const isMe = inviteId === share?.inviteId;
                return (
                  <li key={inviteId} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "relative flex size-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold",
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
                            label={t("sharing.copyLink")}
                            onClick={() => {
                              const link = linkFor(entry, inviteId);
                              if (link) void handOver(link, entry.title || t("common.untitled"));
                            }}
                          >
                            <LinkIcon size={17} />
                          </IconButton>
                        )}
                        <IconButton
                          label={t("sharing.remove", { name: member.name })}
                          onClick={() => removePerson(entry.id, inviteId)}
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

      {share && (
        <footer className="flex justify-between gap-2 border-t border-separator/60 px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => void stop()}
            className="text-[14px] font-medium text-danger"
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
