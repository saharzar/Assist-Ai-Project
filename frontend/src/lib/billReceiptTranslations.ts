import type { LanguageCode } from "../i18n";

export type BillReceiptText = {
  smsTitle: string;
  smsBody: string;
  receiptQuestion: string;
  receiptHelp: string;
  viewReceipt: string;
  noReceipt: string;
  receiptTitle: string;
  receiptSubtitle: string;
  transactionNumber: string;
  paymentDate: string;
  customer: string;
  service: string;
  subscriptionNumber: string;
  billReference: string;
  amountPaid: string;
  paymentMethod: string;
  cardPayment: string;
  paymentStatus: string;
  paid: string;
  downloadReceipt: string;
  receiptSaved: string;
  paidBadge: string;
  paymentThanks: string;
  payAnother: string;
  finishAndLeave: string;
};

export const billReceiptTranslations: Record<LanguageCode, BillReceiptText> = {
  en: { smsTitle: "Payment confirmation", smsBody: "An SMS confirmation has been simulated for this payment.", receiptQuestion: "Would you like an electronic receipt?", receiptHelp: "You can review and save a confirmation containing your payment and bill details.", viewReceipt: "Yes, view my receipt", noReceipt: "No receipt", receiptTitle: "Electronic payment receipt", receiptSubtitle: "Confirmation of your completed bill payment", transactionNumber: "Transaction number", paymentDate: "Payment date", customer: "Customer", service: "Bill type", subscriptionNumber: "Subscription number", billReference: "Bill reference", amountPaid: "Amount paid", paymentMethod: "Payment method", cardPayment: "Credit card", paymentStatus: "Status", paid: "Paid", downloadReceipt: "Save receipt", receiptSaved: "Receipt saved to your device.", paidBadge: "Paid", paymentThanks: "Thank you. Your bill has been paid successfully.", payAnother: "Pay another bill", finishAndLeave: "Finish and leave" },
  es: { smsTitle: "Confirmación del pago", smsBody: "Se ha simulado un SMS de confirmación para este pago.", receiptQuestion: "¿Deseas un recibo electrónico?", receiptHelp: "Puedes revisar y guardar una confirmación con los datos del pago y de la factura.", viewReceipt: "Sí, ver mi recibo", noReceipt: "Sin recibo", receiptTitle: "Recibo electrónico de pago", receiptSubtitle: "Confirmación del pago de factura completado", transactionNumber: "Número de operación", paymentDate: "Fecha de pago", customer: "Cliente", service: "Tipo de factura", subscriptionNumber: "Número de suscripción", billReference: "Referencia de factura", amountPaid: "Importe pagado", paymentMethod: "Método de pago", cardPayment: "Tarjeta de crédito", paymentStatus: "Estado", paid: "Pagado", downloadReceipt: "Guardar recibo", receiptSaved: "El recibo se ha guardado en tu dispositivo.", paidBadge: "Pagada", paymentThanks: "Gracias. Tu factura se ha pagado correctamente.", payAnother: "Pagar otra factura", finishAndLeave: "Finalizar y salir" },
  de: { smsTitle: "Zahlungsbestätigung", smsBody: "Für diese Zahlung wurde eine SMS-Bestätigung simuliert.", receiptQuestion: "Möchten Sie einen elektronischen Beleg?", receiptHelp: "Sie können eine Bestätigung mit Zahlungs- und Rechnungsdaten prüfen und speichern.", viewReceipt: "Ja, Beleg anzeigen", noReceipt: "Kein Beleg", receiptTitle: "Elektronischer Zahlungsbeleg", receiptSubtitle: "Bestätigung Ihrer abgeschlossenen Rechnungszahlung", transactionNumber: "Transaktionsnummer", paymentDate: "Zahlungsdatum", customer: "Kunde", service: "Rechnungsart", subscriptionNumber: "Vertragsnummer", billReference: "Rechnungsnummer", amountPaid: "Bezahlter Betrag", paymentMethod: "Zahlungsart", cardPayment: "Kreditkarte", paymentStatus: "Status", paid: "Bezahlt", downloadReceipt: "Beleg speichern", receiptSaved: "Der Beleg wurde auf Ihrem Gerät gespeichert.", paidBadge: "Bezahlt", paymentThanks: "Vielen Dank. Ihre Rechnung wurde erfolgreich bezahlt.", payAnother: "Weitere Rechnung bezahlen", finishAndLeave: "Beenden und verlassen" },
  tr: { smsTitle: "Ödeme onayı", smsBody: "Bu ödeme için SMS onayı gönderimi canlandırıldı.", receiptQuestion: "Elektronik ödeme makbuzu ister misiniz?", receiptHelp: "Ödeme ve fatura bilgilerinizi içeren onayı görüntüleyip kaydedebilirsiniz.", viewReceipt: "Evet, makbuzumu görüntüle", noReceipt: "Makbuz istemiyorum", receiptTitle: "Elektronik ödeme makbuzu", receiptSubtitle: "Tamamlanan fatura ödemenizin onayı", transactionNumber: "İşlem numarası", paymentDate: "Ödeme tarihi", customer: "Müşteri", service: "Fatura türü", subscriptionNumber: "Abone numarası", billReference: "Fatura referansı", amountPaid: "Ödenen tutar", paymentMethod: "Ödeme yöntemi", cardPayment: "Kredi kartı", paymentStatus: "Durum", paid: "Ödendi", downloadReceipt: "Makbuzu kaydet", receiptSaved: "Makbuz cihazınıza kaydedildi.", paidBadge: "Ödendi", paymentThanks: "Teşekkürler. Faturanız başarıyla ödendi.", payAnother: "Başka fatura öde", finishAndLeave: "Bitir ve ayrıl" },
  pt: { smsTitle: "Confirmação do pagamento", smsBody: "Foi simulada uma confirmação por SMS para este pagamento.", receiptQuestion: "Pretende um recibo eletrónico?", receiptHelp: "Pode consultar e guardar uma confirmação com os dados do pagamento e da fatura.", viewReceipt: "Sim, ver o meu recibo", noReceipt: "Sem recibo", receiptTitle: "Recibo eletrónico de pagamento", receiptSubtitle: "Confirmação do pagamento de fatura concluído", transactionNumber: "Número da operação", paymentDate: "Data do pagamento", customer: "Cliente", service: "Tipo de fatura", subscriptionNumber: "Número de subscrição", billReference: "Referência da fatura", amountPaid: "Montante pago", paymentMethod: "Método de pagamento", cardPayment: "Cartão de crédito", paymentStatus: "Estado", paid: "Pago", downloadReceipt: "Guardar recibo", receiptSaved: "O recibo foi guardado no seu dispositivo.", paidBadge: "Paga", paymentThanks: "Obrigado. A sua fatura foi paga com sucesso.", payAnother: "Pagar outra fatura", finishAndLeave: "Terminar e sair" },
  fr: { smsTitle: "Confirmation du paiement", smsBody: "Une confirmation par SMS a été simulée pour ce paiement.", receiptQuestion: "Souhaitez-vous un reçu électronique ?", receiptHelp: "Vous pouvez consulter et enregistrer une confirmation avec les informations du paiement et de la facture.", viewReceipt: "Oui, voir mon reçu", noReceipt: "Sans reçu", receiptTitle: "Reçu électronique de paiement", receiptSubtitle: "Confirmation du paiement de facture effectué", transactionNumber: "Numéro de transaction", paymentDate: "Date du paiement", customer: "Client", service: "Type de facture", subscriptionNumber: "Numéro d’abonnement", billReference: "Référence de facture", amountPaid: "Montant payé", paymentMethod: "Mode de paiement", cardPayment: "Carte de crédit", paymentStatus: "Statut", paid: "Payé", downloadReceipt: "Enregistrer le reçu", receiptSaved: "Le reçu a été enregistré sur votre appareil.", paidBadge: "Payée", paymentThanks: "Merci. Votre facture a été payée avec succès.", payAnother: "Payer une autre facture", finishAndLeave: "Terminer et quitter" },
};
