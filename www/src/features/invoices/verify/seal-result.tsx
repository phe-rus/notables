import { formatMoney, invoiceKindLabels, type SealCheck } from "@notables/core";
import { CheckIcon, CloseIcon, cn, spring, WarningIcon } from "@ultrapeach/ui";
import { motion } from "motion/react";
import { useState } from "react";
import { knownIssuer, namesakes, rememberIssuer } from "./trusted-issuers";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const formatDate = (date: string | null) =>
  date ? dateFormat.format(new Date(`${date}T00:00:00Z`)) : "-";

type Verdict = "genuine" | "impostor" | "invalid";

/**
 * The outcome of a check, in plain words: genuine (and from whom), signed
 * by someone else than the name it claims, or altered.
 */
export function SealResult({
  check,
  onReset,
  extra,
}: {
  check: SealCheck;
  onReset: () => void;
  /** Further checks shown under the verdict, such as the hidden mark. */
  extra?: React.ReactNode;
}) {
  const [remembered, setRemembered] = useState(() =>
    check.valid ? knownIssuer(check.issuerId) !== null : false,
  );
  const lookalikes = check.valid ? namesakes(check.summary.from, check.issuerId) : [];
  const verdict: Verdict = !check.valid ? "invalid" : lookalikes.length ? "impostor" : "genuine";
  const known = check.valid ? knownIssuer(check.issuerId) : null;

  const tone = {
    genuine: {
      ring: "bg-success",
      title: "Genuine",
      icon: <CheckIcon size={30} strokeWidth={3} />,
    },
    impostor: {
      ring: "bg-warning",
      title: "Not from who it claims",
      icon: <WarningIcon size={28} strokeWidth={2.4} />,
    },
    invalid: {
      ring: "bg-danger",
      title: "Altered or fake",
      icon: <CloseIcon size={28} strokeWidth={3} />,
    },
  }[verdict];

  const explanation =
    verdict === "genuine"
      ? known
        ? `Signed by ${known.name}, whom you’ve checked before. Nothing has changed since it was signed.`
        : "The seal is intact: this is exactly what the issuer signed. Compare the issuer ID with one they gave you to be sure it’s really them."
      : verdict === "impostor"
        ? `It says it’s from ${check.valid ? check.summary.from : ""}, but documents you checked from them carried a different issuer ID. Treat it as fake.`
        : !check.valid && check.reason === "signature"
          ? "The details don’t match the seal. Something was changed after it was signed, or the seal was copied from another document."
          : "This code isn’t a Notables seal, or it’s damaged.";

  return (
    <motion.div
      className="flex flex-col items-center gap-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
    >
      <motion.span
        className={cn(
          "flex size-[72px] items-center justify-center rounded-full text-white shadow-lg",
          tone.ring,
        )}
        initial={{ scale: 0.3, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring.bouncy}
      >
        {tone.icon}
      </motion.span>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-title font-bold tracking-tight">{tone.title}</h1>
        <p className="max-w-[420px] text-subheadline leading-snug text-label-secondary">
          {explanation}
        </p>
      </div>
      {extra}

      {check.summary && (
        <dl className="grid w-full grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 rounded-4xl border border-separator/70 bg-elevated p-5 text-[14px]">
          <Row label="Document">
            {invoiceKindLabels[check.summary.kind]} {check.summary.no}
          </Row>
          <Row label="From">{check.summary.from || "-"}</Row>
          <Row label="To">{check.summary.to || "-"}</Row>
          <Row label={check.summary.kind === "receipt" ? "Paid on" : "Issued"}>
            {formatDate(check.summary.on)}
          </Row>
          {check.summary.due && (
            <Row label={check.summary.kind === "quote" ? "Valid until" : "Due"}>
              {formatDate(check.summary.due)}
            </Row>
          )}
          <Row label="Items">{check.summary.items}</Row>
          <Row label="Tax">{formatMoney(check.summary.tax, check.summary.cur)}</Row>
          <Row label="Total">
            <span className="text-body font-bold">
              {formatMoney(check.summary.total, check.summary.cur)}
            </span>
          </Row>
          {"issuerId" in check && check.issuerId && (
            <Row label="Issuer ID">
              <span className="font-mono font-semibold">{check.issuerId}</span>
            </Row>
          )}
        </dl>
      )}

      {check.valid && verdict === "genuine" && (
        <p className="text-center text-footnote leading-snug text-label-tertiary">
          Check these details match the paper you were given. If they don’t, the paper was changed.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2.5">
        {check.valid && verdict === "genuine" && !remembered && (
          <button
            type="button"
            onClick={() => {
              rememberIssuer(check.issuerId, check.summary.from);
              setRemembered(true);
            }}
            className="rounded-full bg-inverse px-5 py-2.5 text-subheadline font-semibold text-on-inverse transition-transform active:scale-[0.97]"
          >
            Trust {check.summary.from || "this issuer"}
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-full bg-fill px-5 py-2.5 text-subheadline font-semibold text-label transition-transform active:scale-[0.97]"
        >
          Check another
        </button>
      </div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-label-secondary">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </>
  );
}
