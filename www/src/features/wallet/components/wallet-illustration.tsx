/** Decorative cards, with no invented account details or payment branding. */
export function WalletIllustration() {
  return (
    <div aria-hidden className="relative mx-auto h-40 w-64">
      <div className="absolute inset-x-6 top-1 h-28 -rotate-12 rounded-3xl border border-accent/20 bg-accent/15" />
      <div className="absolute inset-x-3 top-5 h-28 rotate-6 rounded-3xl border border-accent/30 bg-accent/30" />
      <div className="absolute inset-x-2 top-9 flex h-28 flex-col justify-between rounded-3xl border border-separator bg-elevated p-5 shadow-md">
        <span className="h-2 w-20 rounded-full bg-label/70" />
        <div className="flex items-end justify-between">
          <span className="h-2 w-28 rounded-full bg-label/20" />
          <span className="size-7 rounded-full bg-accent/60" />
        </div>
      </div>
    </div>
  );
}
