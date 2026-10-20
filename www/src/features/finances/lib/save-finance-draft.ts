import { localMediaSrc, parseMoney } from "@notables/core";
import type { FinanceDraft, FinanceSaveServices } from "@/features/finances/model/types";

export async function saveFinanceDraft(
  draft: FinanceDraft,
  files: readonly File[],
  services: FinanceSaveServices,
) {
  const amount = parseMoney(draft.amount, draft.currency);
  if (!amount || !Number.isSafeInteger(amount) || !draft.description.trim())
    throw new Error("invalid-transaction");
  services.store.validate({ ...draft, amount }, draft.id);
  const attachments = [...draft.attachments];
  for (const file of files) attachments.push(localMediaSrc(await services.writeMedia(file)));
  return services.store.save({ ...draft, amount, attachments }, draft.id);
}
