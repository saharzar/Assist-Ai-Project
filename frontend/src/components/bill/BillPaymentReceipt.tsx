import { CheckCircle2, Download, FileText } from "lucide-react";
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
  const [showReceipt, setShowReceipt] = useState(false);
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-700"><CheckCircle2 className="h-9 w-9" /></span>
        <h2 className="mt-3 text-2xl font-extrabold text-[#1d1a5e]">{thanksTitle}</h2>
        <p className="mt-2 text-base font-semibold text-slate-600">{confirmationMessage}</p>
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
        <div className="mt-5 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-cyan-50 p-5">
            <CheckCircle2 className="h-9 w-9 shrink-0 text-teal-700" />
            <div><h2 className="text-xl font-extrabold text-[#1d1a5e]">{text.receiptTitle}</h2><p className="text-sm text-slate-600">{text.receiptSubtitle}</p></div>
          </div>
          <dl className="grid gap-x-6 p-5 sm:grid-cols-2">
            {receiptRows.map(([label, value]) => <div key={label} className="border-b border-slate-200 py-2.5"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-[#1d1a5e]">{value}</dd></div>)}
          </dl>
          <div className="grid gap-3 border-t border-slate-200 p-5 sm:grid-cols-3">
            <button type="button" onClick={saveReceipt} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#302992] px-4 py-3 font-bold text-white hover:bg-[#211c72]"><Download className="h-5 w-5" /> {text.downloadReceipt}</button>
            <button type="button" onClick={onPayAnother} className="min-h-12 rounded-xl border-2 border-[#302992] px-4 py-3 font-bold text-[#302992] hover:bg-indigo-50">{text.payAnother}</button>
            <Link to="/scenarios" className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-slate-400 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">{text.finishAndLeave}</Link>
          </div>
          {saved && <p role="status" className="px-5 pb-4 text-center text-sm font-bold text-teal-700">{text.receiptSaved}</p>}
        </div>
      )}
    </div>
  );
}
