import { Button, CloseIcon, IconButton, ShareIcon, Sheet, toast } from "@notables/ui";
import { useState } from "react";
import { Field, SelectInput, TextInput } from "../../../components/form/form-fields";
import { t } from "../../../i18n/i18n";
import { useAuthorName } from "../../../platform/author-preferences";
import { isListedNote, useLibrary } from "../../library/store/library-store";
import { handOver } from "../../sharing/lib/hand-over";
import { invitePerson, startSharing } from "../../sharing/lib/share-actions";
import { useShares } from "../../sharing/store/share-store";

/**
 * Invites someone from Connections: pick a note, name them, and hand the
 * link over. Only notes this device owns or hasn't shared can invite.
 */
export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={t("connections.inviteTitle")}
      className="max-w-[440px]"
    >
      <InviteForm onClose={onClose} />
    </Sheet>
  );
}

function InviteForm({ onClose }: { onClose: () => void }) {
  const library = useLibrary();
  const shares = useShares();
  const authorName = useAuthorName();
  const joined = new Set(shares.filter((s) => s.role === "member").map((s) => s.noteId));
  const notes = library.filter((entry) => isListedNote(entry) && !joined.has(entry.id));
  const [noteId, setNoteId] = useState(notes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const entry = notes.find((note) => note.id === noteId);

  const invite = async () => {
    const person = name.trim();
    if (!entry || !person) return;
    setBusy(true);
    try {
      if (!shares.some((share) => share.noteId === entry.id)) startSharing(entry, authorName);
      const link = await invitePerson(entry, person);
      await handOver(link, entry.title || t("common.untitled"));
      onClose();
    } catch (error) {
      toast.error(t("sharing.couldNotInvite"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-bold tracking-tight">{t("connections.inviteTitle")}</h2>
          <p className="text-[13px] leading-snug text-label-secondary">{t("sharing.explainer")}</p>
        </div>
        <IconButton label={t("common.close")} onClick={onClose}>
          <CloseIcon size={18} />
        </IconButton>
      </header>
      {notes.length === 0 ? (
        <p className="px-6 pt-3 pb-8 text-[15px] text-label-secondary">
          {t("connections.noNotes")}
        </p>
      ) : (
        <form
          className="flex flex-col gap-4 px-6 pt-3 pb-6"
          onSubmit={(event) => {
            event.preventDefault();
            void invite();
          }}
        >
          <Field label={t("connections.inviteNote")}>
            <SelectInput
              label={t("connections.inviteNote")}
              value={noteId}
              onChange={setNoteId}
              options={notes.map((note) => ({
                value: note.id,
                label: note.title || t("common.untitled"),
              }))}
            />
          </Field>
          <Field label={t("connections.inviteName")}>
            <TextInput
              value={name}
              maxLength={60}
              placeholder={t("sharing.personPlaceholder")}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Button variant="primary" type="submit" disabled={busy || !name.trim() || !entry}>
            <ShareIcon size={16} />
            {t("connections.inviteSend")}
          </Button>
        </form>
      )}
    </>
  );
}
