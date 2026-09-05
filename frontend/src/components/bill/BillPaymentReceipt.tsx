import { CheckCircle2, CreditCard, Download, FileCheck2, FileText, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useTranslation } from "../../i18n";
import { billReceiptTranslations } from "../../lib/billReceiptTranslations";

type ReceiptDetails = {
  customerName: string;
  billLabel: string;
  amount: string;
  subscriptionNumber: string;
  billReference: string;
};

export function BillPaymentReceipt({ details, thanksTitle, confirmationMessage, onPayAnother, onReceiptVisibilityChange }: {
  details: ReceiptDetails;
  thanksTitle: string;
  confirmationMessage: string;
  onPayAnother: () => void;
  onReceiptVisibilityChange?: (visible: boolean) => void;
}) {
  const { language } = useTranslation();
  const text = billReceiptTranslations[language];
  const [showReceipt, setShowReceipt] = useState(true);
  const [saved, setSaved] = useState(false);
  const transaction = useMemo(() => `TXN-${Date.now().toString().slice(-10)}`, []);
  const paymentDate = useMemo(() => new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : language, { dateStyle: "long", timeStyle: "short" }).format(new Date()), [language]);

  const receiptRows = [
    [text.transactionNumber, transaction],
    [text.paymentDate, paymentDate],
    [text.customer, details.customerName],
    [text.service, details.billLabel],
    [text.subscriptionNumber, details.subscriptionNumber],
    [text.billReference, details.billReference],
    [text.paymentMethod, text.cardPayment],
    [text.amountPaid, details.amount],
    [text.paymentStatus, text.paid],
  ];

  const saveReceipt = async () => {
    const { jsPDF } = await import("jspdf");
    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#302992";
    context.fillRect(0, 0, canvas.width, 210);
    context.fillStyle = "#ffffff";
    context.font = "700 48px Arial, sans-serif";
    context.fillText("ASSIST-AI", 80, 88);
    context.font = "700 34px Arial, sans-serif";
    context.fillText(text.receiptTitle, 80, 148);
    context.font = "24px Arial, sans-serif";
    context.fillStyle = "#dff7fa";
    context.fillText(text.receiptSubtitle, 80, 187);

    let y = 275;
    receiptRows.forEach(([label, value], index) => {
      if (index % 2 === 0) {
        context.fillStyle = "#f5f7ff";
        context.fillRect(70, y - 32, 1100, 112);
      }
      context.fillStyle = "#64748b";
      context.font = "700 20px Arial, sans-serif";
      context.fillText(label.toUpperCase(), 100, y);
      context.fillStyle = "#1d1a5e";
      context.font = "700 27px Arial, sans-serif";
      context.fillText(value, 100, y + 43, 1040);
      y += 122;
    });

    context.strokeStyle = "#22c7d6";
    context.lineWidth = 4;
    context.strokeRect(70, 245, 1100, y - 245);
    context.fillStyle = "#087f8c";
    context.font = "700 24px Arial, sans-serif";
    context.fillText(text.paid, 80, 1660);
    context.fillStyle = "#64748b";
    context.font = "20px Arial, sans-serif";
    context.fillText(transaction, 80, 1698);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
    pdf.save(`ASSIST-AI-${transaction}.pdf`);
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-[#057a55] via-[#079c6b] to-[#087f8c] px-6 py-6 text-white shadow-[0_22px_45px_-28px_rgba(5,122,85,0.8)] sm:px-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-[#079c6b] shadow-lg ring-8 ring-white/15"><CheckCircle2 className="h-12 w-12" /></span>
          <div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-100">{text.paidBadge}</p><h2 className="mt-1 text-3xl font-extrabold">{thanksTitle}</h2><p className="mt-2 text-base font-semibold text-emerald-50">{confirmationMessage}</p></div>
        </div>
      </div>
      {!showReceipt ? (
        <div className="rounded-2xl border border-indigo-200 bg-white p-5 text-center shadow-sm sm:p-7">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700"><FileText className="h-7 w-7" /></span>
          <h2 className="mt-4 text-2xl font-extrabold text-[#1d1a5e]">{text.receiptQuestion}</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">{text.receiptHelp}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => { setShowReceipt(true); onReceiptVisibilityChange?.(true); }} className="min-h-12 rounded-xl bg-[#302992] px-4 py-3 font-bold text-white hover:bg-[#211c72]">{text.viewReceipt}</button>
            <button type="button" onClick={onPayAnother} className="min-h-12 rounded-xl border-2 border-[#302992] bg-white px-4 py-3 font-bold text-[#302992] hover:bg-indigo-50">{text.payAnother}</button>
            <Link to="/scenarios" className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-slate-400 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">{text.finishAndLeave}</Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white shadow-[0_24px_55px_-38px_rgba(48,41,146,0.7)]">
          <div className="relative overflow-hidden bg-gradient-to-r from-[#211c72] via-[#302992] to-[#087f8c] p-6 text-white sm:px-8">
            <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border-[22px] border-white/10" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><ReceiptText className="h-8 w-8" /></span>
              <div><h2 className="text-2xl font-extrabold">{text.receiptTitle}</h2><p className="mt-1 text-sm font-medium text-cyan-50">{text.receiptSubtitle}</p></div>
              <span className="ml-auto hidden rounded-full bg-emerald-400 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-emerald-950 sm:inline-flex">✓ {text.paid}</span>
            </div>
          </div>
          <div className="grid gap-4 bg-gradient-to-br from-indigo-50/70 to-cyan-50/60 p-5 sm:grid-cols-2 sm:p-7">
            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-[#302992]"><FileCheck2 className="h-6 w-6" /></span><p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">{text.transactionNumber}</p><p className="mt-1 break-all font-mono text-lg font-extrabold text-[#1d1a5e]">{transaction}</p></div>
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 shadow-sm"><p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700">{text.amountPaid}</p><p className="mt-2 text-4xl font-extrabold text-emerald-800">{details.amount}</p><p className="mt-2 inline-flex rounded-full bg-emerald-700 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">{text.paid}</p></div>
          </div>
          <dl className="grid gap-3 px-5 pb-6 sm:grid-cols-2 sm:px-7">
            {receiptRows.filter(([label]) => label !== text.transactionNumber && label !== text.amountPaid && label !== text.paymentStatus).map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><dt className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-base font-bold text-[#1d1a5e]">{value}</dd></div>)}
          </dl>
          <div className="grid gap-3 border-t border-indigo-100 bg-slate-50/80 p-5 sm:grid-cols-3 sm:p-6">
            <button type="button" onClick={saveReceipt} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#079c6b] px-4 py-3 font-extrabold text-white shadow-md hover:bg-[#057a55]"><Download className="h-5 w-5" /> {text.downloadReceipt}</button>
            <button type="button" onClick={onPayAnother} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-[#302992] bg-white px-4 py-3 font-extrabold text-[#302992] hover:bg-indigo-50"><CreditCard className="h-5 w-5" />{text.payAnother}</button>
            <Link to="/scenarios" className="inline-flex min-h-14 items-center justify-center rounded-xl border-2 border-slate-400 bg-white px-4 py-3 font-extrabold text-slate-700 hover:bg-slate-100">{text.finishAndLeave}</Link>
          </div>
          {saved && <p role="status" className="px-5 pb-4 text-center text-sm font-bold text-teal-700">{text.receiptSaved}</p>}
        </div>
      )}
    </div>
  );
}
