import type { LanguageCode } from "../i18n";

export type BillStatementText = {
  details: string;
  customer: string;
  provider: string;
  subscriptionNumber: string;
  referenceNumber: string;
  dueDate: string;
  dueShort: string;
  deadlineNotice: string;
  summary: string;
};

export const billStatementTranslations: Record<LanguageCode, BillStatementText> = {
  en: { details: "Bill details", customer: "Customer name", provider: "Service", subscriptionNumber: "Subscription number", referenceNumber: "Bill reference", dueDate: "Payment due date", dueShort: "Due", deadlineNotice: "Please pay this bill by {date}.", summary: "{name}, you have {amount} to pay for your {bill} bill. Payment is due by {date}." },
  es: { details: "Detalles de la factura", customer: "Nombre del cliente", provider: "Servicio", subscriptionNumber: "Número de suscripción", referenceNumber: "Referencia de factura", dueDate: "Fecha límite de pago", dueShort: "Vence", deadlineNotice: "Paga esta factura antes del {date}.", summary: "{name}, debes pagar {amount} por tu factura de {bill}. El pago vence el {date}." },
  de: { details: "Rechnungsdetails", customer: "Kundenname", provider: "Dienst", subscriptionNumber: "Vertragsnummer", referenceNumber: "Rechnungsnummer", dueDate: "Zahlungsfrist", dueShort: "Fällig", deadlineNotice: "Bitte bezahlen Sie diese Rechnung bis zum {date}.", summary: "{name}, für Ihre {bill}-Rechnung sind {amount} zu zahlen. Die Zahlung ist bis zum {date} fällig." },
  tr: { details: "Fatura ayrıntıları", customer: "Müşteri adı", provider: "Hizmet", subscriptionNumber: "Abone numarası", referenceNumber: "Fatura referansı", dueDate: "Son ödeme tarihi", dueShort: "Son ödeme", deadlineNotice: "Lütfen bu faturayı {date} tarihine kadar ödeyin.", summary: "{name}, {bill} faturası için ödemeniz gereken tutar {amount}. Son ödeme tarihi: {date}." },
  pt: { details: "Detalhes da fatura", customer: "Nome do cliente", provider: "Serviço", subscriptionNumber: "Número de subscrição", referenceNumber: "Referência da fatura", dueDate: "Data-limite de pagamento", dueShort: "Vence", deadlineNotice: "Pague esta fatura até {date}.", summary: "{name}, tem {amount} a pagar pela sua fatura de {bill}. O pagamento vence em {date}." },
  fr: { details: "Détails de la facture", customer: "Nom du client", provider: "Service", subscriptionNumber: "Numéro d’abonnement", referenceNumber: "Référence de facture", dueDate: "Date limite de paiement", dueShort: "Échéance", deadlineNotice: "Veuillez payer cette facture avant le {date}.", summary: "{name}, vous devez payer {amount} pour votre facture de {bill}. Le paiement est dû avant le {date}." },
};
