import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "../../i18n";
import type { PracticeCardDetails } from "../../lib/practiceCard";
import { practiceCardTranslations } from "../../lib/practiceCardTranslations";

export type CardPreviewDetails = PracticeCardDetails;
export type ActiveCardField = "cardholderName" | "cardNumber" | "expiry" | "cvv";

export function BillCardPreview({ details, activeField = null }: { details: CardPreviewDetails; activeField?: ActiveCardField | null }) {
  const { language } = useTranslation();
  const labels = practiceCardTranslations[language];
  const [showBack, setShowBack] = useState(false);
  const visibleNumber = details.cardNumber.match(/.{1,4}/g)?.join(" ") ?? details.cardNumber;

  useEffect(() => {
    if (activeField) setShowBack(activeField === "cvv");
  }, [activeField]);

  const highlighted = (field: ActiveCardField) => activeField === field;
  const highlightClass = "rounded-md bg-white/25 px-2 py-1 ring-4 ring-white/70";

  return (
    <button type="button" aria-label={showBack ? labels.flipToFront : labels.flipToBack} aria-pressed={showBack} onClick={() => setShowBack((current) => !current)} className="group block w-full rounded-2xl text-left outline-none [perspective:1200px] focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-4">
      <span className={`relative block aspect-[1.58/1] w-full transition-transform duration-700 [transform-style:preserve-3d] ${showBack ? "[transform:rotateY(180deg)]" : ""}`}>
        <span className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#111b55] via-[#173d93] to-[#159fb5] p-4 text-white shadow-2xl [backface-visibility:hidden]">
          <span className="absolute -bottom-16 -right-10 h-48 w-64 rotate-[-12deg] rounded-full border-[18px] border-cyan-300/20" aria-hidden="true" />
          <span className="relative flex h-full flex-col justify-between">
            <span className="flex items-start justify-between"><span className="h-8 w-12 rounded-md bg-gradient-to-br from-amber-200 to-amber-500 shadow-inner" aria-hidden="true" /><strong className="text-base tracking-wide">ASSIST-AI BANK</strong></span>
            <strong className={`font-mono text-base tracking-[0.07em] sm:text-lg ${highlighted("cardNumber") ? highlightClass : ""}`}>{visibleNumber}</strong>
            <span className="flex items-end justify-between gap-4 text-xs uppercase tracking-wider"><span className={`min-w-0 ${highlighted("cardholderName") ? highlightClass : ""}`}><span className="block text-white/60">{labels.holder}</span><strong className="mt-1 block truncate">{details.cardholderName || labels.holder}</strong></span><span className={highlighted("expiry") ? highlightClass : ""}><span className="block text-white/60">{labels.expires}</span><strong className="mt-1 block">{details.expiry}</strong></span></span>
          </span>
        </span>

        <span className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#111b55] via-[#173d93] to-[#159fb5] py-4 text-white shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="mt-2 block h-10 w-full bg-slate-950" aria-hidden="true" />
          <span className="mx-4 mt-4 flex items-center rounded bg-white p-1.5 text-slate-950"><span className="h-7 flex-1 bg-[repeating-linear-gradient(0deg,#e2e8f0_0,#e2e8f0_2px,#fff_2px,#fff_5px)]" aria-hidden="true" /><span className={`ml-2 text-right transition-all duration-300 ${highlighted("cvv") ? "rounded-md bg-cyan-100 px-3 py-1 ring-4 ring-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.95)]" : ""}`}><span className={`block text-[9px] font-bold uppercase ${highlighted("cvv") ? "text-cyan-900" : "text-slate-500"}`}>CVV</span><strong className="font-mono text-base tracking-widest">{details.cvv}</strong></span></span>
          <span className="mx-4 mt-3 flex items-center justify-between"><strong className="text-sm tracking-wide">ASSIST-AI BANK</strong><span className="text-[10px] font-semibold text-cyan-100">{labels.securityCode}</span></span>
        </span>
      </span>
      <span className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-[#302992]"><RotateCw className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-180" /> {labels.flipHint}</span>
      <span className="sr-only">{labels.preview}</span>
    </button>
  );
}
