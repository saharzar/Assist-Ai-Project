import type { LanguageCode } from "../i18n";
export type RestaurantPaymentText = {
  heading: string; question: string; card: string; cash: string; cardInstruction: string; cashInstruction: string;
  tap: string; give: string; processing: string; cardSuccess: string; cashSuccess: string;
  receipt: string; paymentMethod: string; total: string; paid: string; complete: string; practice: string;
  totalQuestion: string; order: string; cardLabel: string; cashLabel: string; processingLabel: string; noDrink: string; change: string;
};
export const restaurantPaymentTranslations: Record<LanguageCode, RestaurantPaymentText> = {
  en: {
    totalQuestion: "Your total is {total}. How would you like to pay?", order: "Your order", cardLabel: "Card", cashLabel: "Cash", processingLabel: "Processing…", noDrink: "No drink", change: "Change",
    heading: "Choose how to pay", question: "How would you like to pay?", card: "Pay by card", cash: "Pay with cash",
    cardInstruction: "Please tap your card on the payment terminal.", cashInstruction: "Please give the cash to the cashier.",
    tap: "Tap your card", give: "Give cash", processing: "Your payment is being processed.", cardSuccess: "Payment successful.", cashSuccess: "Payment received.",
    receipt: "Restaurant receipt", paymentMethod: "Payment method", total: "Total", paid: "Paid", complete: "Thank you for your order. We'll prepare your meal shortly.", practice: "Practice payment only. Do not use real card details or money.",
  },
  es: {
    totalQuestion: "El total es {total}. ¿Cómo te gustaría pagar?", order: "Tu pedido", cardLabel: "Tarjeta", cashLabel: "Efectivo", processingLabel: "Procesando…", noDrink: "Sin bebida", change: "Cambio",
    heading: "Elige cómo pagar", question: "¿Cómo te gustaría pagar?", card: "Pagar con tarjeta", cash: "Pagar en efectivo",
    cardInstruction: "Acerca tu tarjeta al terminal, por favor.", cashInstruction: "Entrega el efectivo al personal de caja, por favor.",
    tap: "Acercar tu tarjeta", give: "Entregar efectivo", processing: "Se está procesando tu pago.", cardSuccess: "Pago realizado correctamente.", cashSuccess: "Pago recibido.",
    receipt: "Recibo del restaurante", paymentMethod: "Forma de pago", total: "Total", paid: "Pagado", complete: "Gracias por tu pedido. Prepararemos tu comida en breve.", practice: "Este pago es solo una práctica. No uses datos reales de tarjeta ni dinero real.",
  },
  de: {
    totalQuestion: "Der Gesamtbetrag ist {total}. Wie möchtest du bezahlen?", order: "Deine Bestellung", cardLabel: "Karte", cashLabel: "Bargeld", processingLabel: "Wird verarbeitet…", noDrink: "Ohne Getränk", change: "Wechselgeld",
    heading: "Zahlungsart wählen", question: "Wie möchtest du bezahlen?", card: "Mit Karte bezahlen", cash: "Bar bezahlen",
    cardInstruction: "Halte deine Karte bitte an das Terminal.", cashInstruction: "Gib das Bargeld bitte an der Kasse ab.",
    tap: "Karte ans Terminal halten", give: "Bargeld geben", processing: "Deine Zahlung wird verarbeitet.", cardSuccess: "Zahlung erfolgreich.", cashSuccess: "Zahlung erhalten.",
    receipt: "Restaurantbeleg", paymentMethod: "Zahlungsart", total: "Gesamtbetrag", paid: "Bezahlt", complete: "Vielen Dank für deine Bestellung. Wir bereiten dein Essen in Kürze zu.", practice: "Dies ist nur eine Zahlungsübung. Verwende keine echten Kartendaten und kein echtes Geld.",
  },
  tr: {
    totalQuestion: "Toplam tutar {total}. Nasıl ödeme yapmak istersin?", order: "Siparişin", cardLabel: "Kart", cashLabel: "Nakit", processingLabel: "İşleniyor…", noDrink: "İçecek yok", change: "Para üstü",
    heading: "Ödeme yöntemini seç", question: "Nasıl ödeme yapmak istersin?", card: "Kartla öde", cash: "Nakit öde",
    cardInstruction: "Lütfen kartını ödeme cihazına yaklaştır.", cashInstruction: "Lütfen parayı kasiyere ver.",
    tap: "Kartını yaklaştır", give: "Parayı ver", processing: "Ödemen işleniyor.", cardSuccess: "Ödeme başarılı.", cashSuccess: "Ödeme alındı.",
    receipt: "Restoran fişi", paymentMethod: "Ödeme yöntemi", total: "Toplam", paid: "Ödendi", complete: "Siparişin için teşekkür ederiz. Yemeğini kısa süre içinde hazırlayacağız.", practice: "Bu ödeme yalnızca bir alıştırmadır. Gerçek kart bilgileri veya para kullanma.",
  },
  pt: {
    totalQuestion: "O total é {total}. Como gostarias de pagar?", order: "O teu pedido", cardLabel: "Cartão", cashLabel: "Dinheiro", processingLabel: "A processar…", noDrink: "Sem bebida", change: "Troco",
    heading: "Escolhe como pagar", question: "Como gostarias de pagar?", card: "Pagar com cartão", cash: "Pagar em dinheiro",
    cardInstruction: "Aproxima o teu cartão do terminal, por favor.", cashInstruction: "Entrega o dinheiro na caixa, por favor.",
    tap: "Aproximar o teu cartão", give: "Entregar dinheiro", processing: "O teu pagamento está a ser processado.", cardSuccess: "Pagamento realizado com sucesso.", cashSuccess: "Pagamento recebido.",
    receipt: "Recibo do restaurante", paymentMethod: "Método de pagamento", total: "Total", paid: "Pago", complete: "Agradecemos o teu pedido. Vamos preparar a tua refeição em breve.", practice: "Este pagamento é apenas uma prática. Não uses dados reais de cartão nem dinheiro real.",
  },
  fr: {
    totalQuestion: "Le total est de {total}. Comment aimerais-tu payer ?", order: "Ta commande", cardLabel: "Carte", cashLabel: "Espèces", processingLabel: "En cours…", noDrink: "Sans boisson", change: "Monnaie rendue",
    heading: "Choisis comment payer", question: "Comment aimerais-tu payer ?", card: "Payer par carte", cash: "Payer en espèces",
    cardInstruction: "Approche ta carte du terminal, s'il te plaît.", cashInstruction: "Donne l'argent à la personne en caisse, s'il te plaît.",
    tap: "Approcher ta carte", give: "Donner l'argent", processing: "Ton paiement est en cours.", cardSuccess: "Paiement réussi.", cashSuccess: "Paiement reçu.",
    receipt: "Reçu du restaurant", paymentMethod: "Mode de paiement", total: "Total", paid: "Payé", complete: "Merci pour ta commande. Nous allons préparer ton repas très bientôt.", practice: "Ce paiement est seulement un exercice. N'utilise pas de vraies informations de carte ni d'argent réel.",
  },
};
