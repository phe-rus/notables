import type { CardKind } from "../model/wallet-model";

/** Decorative print only. Never substitute these patterns for a usable code or seal. */
export function CardArtwork({ kind }: { kind: CardKind }) {
  return (
    <svg
      data-brand
      aria-hidden="true"
      viewBox="0 0 428 270"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      fill="none"
    >
      {kind === "bank" && (
        <g stroke="currentColor">
          <ellipse cx="390" cy="270" rx="260" ry="205" strokeWidth="1" opacity=".12" />
          <ellipse cx="390" cy="270" rx="230" ry="175" strokeWidth="26" opacity=".05" />
          <rect x="27" y="96" width="42" height="32" rx="7" fill="currentColor" opacity=".15" />
          <path d="M27 107h42m-42 10h42m-28-21v32m14-32v32" opacity=".28" />
        </g>
      )}
      {kind === "national-id" && (
        <g stroke="currentColor">
          <path d="M0 0h12v270H0" fill="currentColor" opacity=".8" />
          <path
            d="M295 78c-100 0-100 130 0 130s100-130 0-130Zm0 9c-85 0-85 112 0 112s85-112 0-112Zm0 9c-70 0-70 94 0 94s70-94 0-94Z"
            opacity=".09"
          />
          <path d="M220 235h180m-180 7h180m-180 7h180" opacity=".15" />
        </g>
      )}
      {kind === "passport" && (
        <g stroke="currentColor" opacity=".25">
          <rect x="12" y="12" width="404" height="246" rx="12" />
          <circle cx="352" cy="146" r="37" />
          <ellipse cx="352" cy="146" rx="18" ry="37" />
          <path d="M315 146h74m-68-18h62m-62 36h62" />
        </g>
      )}
      {kind === "electricity" && (
        <g fill="currentColor">
          <path d="M330 55h57l-36 68h31l-80 99 20-83h-34Z" opacity=".12" />
          <path d="m0 235 428-80v115H0Z" opacity=".05" />
        </g>
      )}
      {kind === "television" && (
        <g stroke="currentColor" opacity=".12">
          <circle cx="365" cy="178" r="50" strokeWidth="20" />
          <circle cx="365" cy="178" r="90" strokeWidth="12" />
          <circle cx="365" cy="178" r="125" strokeWidth="4" />
        </g>
      )}
      {kind === "sim" && (
        <g stroke="currentColor">
          <path
            d="M313 80h42l35 35v85a12 12 0 0 1-12 12h-65a12 12 0 0 1-12-12V92a12 12 0 0 1 12-12Z"
            fill="currentColor"
            opacity=".08"
          />
          <rect x="321" y="133" width="49" height="55" rx="8" opacity=".22" />
          <path d="M321 151h49m-49 19h49m-33-37v55m16-55v55" opacity=".22" />
        </g>
      )}
      {kind === "membership" && (
        <g stroke="currentColor" opacity=".12">
          <circle cx="382" cy="-12" r="145" strokeWidth="36" />
          <circle cx="382" cy="-12" r="100" strokeWidth="2" />
          <path d="m355 173 7 15 16 2-12 12 3 16-14-8-15 8 3-16-12-12 17-2Z" fill="currentColor" />
        </g>
      )}
      {kind === "other" && <path d="M0 250h428" stroke="currentColor" opacity=".12" />}
    </svg>
  );
}
