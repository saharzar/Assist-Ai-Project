export type CardPreviewDetails = {
  cardNumber: string;
  expiry: string;
  cardholderName: string;
};

export function BillCardPreview({ details }: { details: CardPreviewDetails }) {
  const visibleNumber = details.cardNumber.padEnd(16, "•").match(/.{1,4}/g)?.join(" ") ?? "•••• •••• •••• ••••";

  return (
    <div className="relative aspect-[1.58/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#111b55] via-[#173d93] to-[#159fb5] p-6 text-white shadow-2xl" aria-label="Credit card preview">
      <div className="absolute -bottom-16 -right-10 h-48 w-64 rotate-[-12deg] rounded-full border-[18px] border-cyan-300/20" aria-hidden="true" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="h-10 w-14 rounded-lg bg-gradient-to-br from-amber-200 to-amber-500 shadow-inner" aria-hidden="true" />
          <strong className="text-xl tracking-wide">ASSIST-AI BANK</strong>
        </div>
        <p className="font-mono text-lg font-bold tracking-[0.12em] sm:text-xl">{visibleNumber}</p>
        <div className="flex items-end justify-between gap-4 text-xs uppercase tracking-wider">
          <div><span className="block text-white/60">Cardholder</span><strong className="mt-1 block truncate">{details.cardholderName || "YOUR NAME"}</strong></div>
          <div><span className="block text-white/60">Expires</span><strong className="mt-1 block">{details.expiry || "MM/YY"}</strong></div>
        </div>
      </div>
    </div>
  );
}
