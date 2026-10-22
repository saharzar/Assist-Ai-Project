import type { LanguageCode } from "../i18n";
export type RestaurantPaymentText = {
  heading: string; question: string; card: string; cash: string; cardInstruction: string; cashInstruction: string;
  tap: string; give: string; processing: string; cardSuccess: string; cashSuccess: string;
  receipt: string; paymentMethod: string; total: string; paid: string; complete: string; practice: string;
  totalQuestion: string; order: string; cardLabel: string; cashLabel: string; processingLabel: string; noDrink: string; change: string;
};
export const restaurantPaymentTranslations: Record<LanguageCode, RestaurantPaymentText> = {
  en: {
    totalQuestion: "Your total comes to {total}. How would you like to pay? You can choose card or cash.", order: "Your order", cardLabel: "Card", cashLabel: "Cash", processingLabel: "Processing…", noDrink: "No drink", change: "Change",
    heading: "Choose how to pay", question: "How would you like to pay?", card: "Pay by card", cash: "Pay with cash",
    cardInstruction: "Of course. Please use the card terminal to complete your payment.", cashInstruction: "Of course. Please give the cash when you're ready.",
    tap: "Tap your card", give: "Give cash", processing: "Thank you. One moment while I process your payment.", cardSuccess: "Thank you. Your payment was successful. Here is your receipt.", cashSuccess: "Thank you. Your payment was successful. Here is your receipt.",
    receipt: "Restaurant receipt", paymentMethod: "Payment", total: "Total", paid: "Paid", complete: "Thank you very much. Your order is complete. I hope you enjoy your meal.", practice: "Practice payment only. Do not use real card details or money.",
  },
  es: {
    totalQuestion: "El total es {total}. ¿Cómo te gustaría pagar? Puedes elegir tarjeta o efectivo.", order: "Tu pedido", cardLabel: "Tarjeta", cashLabel: "Efectivo", processingLabel: "Procesando…", noDrink: "Sin bebida", change: "Cambio",
    heading: "Elige cómo pagar", question: "¿Cómo te gustaría pagar?", card: "Pagar con tarjeta", cash: "Pagar en efectivo",
    cardInstruction: "Por supuesto. Usa el terminal para completar el pago con tarjeta.", cashInstruction: "Por supuesto. Entrega el efectivo cuando estés listo.",
    tap: "Acercar tu tarjeta", give: "Entregar efectivo", processing: "Gracias. Un momento mientras proceso tu pago.", cardSuccess: "Gracias. El pago se ha realizado correctamente. Aquí tienes tu recibo.", cashSuccess: "Gracias. El pago se ha realizado correctamente. Aquí tienes tu recibo.",
    receipt: "Recibo del restaurante", paymentMethod: "Pago", total: "Total", paid: "Pagado", complete: "Muchas gracias. Tu pedido está completo. Espero que disfrutes de tu comida.", practice: "Este pago es solo una práctica. No uses datos reales de tarjeta ni dinero real.",
  },
  de: {
    totalQuestion: "Der Gesamtbetrag ist {total}. Wie möchtest du bezahlen? Du kannst Karte oder Bargeld wählen.", order: "Deine Bestellung", cardLabel: "Karte", cashLabel: "Bargeld", processingLabel: "Wird verarbeitet…", noDrink: "Ohne Getränk", change: "Wechselgeld",
    heading: "Zahlungsart wählen", question: "Wie möchtest du bezahlen?", card: "Mit Karte bezahlen", cash: "Bar bezahlen",
    cardInstruction: "Natürlich. Bitte bezahle mit deiner Karte am Terminal.", cashInstruction: "Natürlich. Gib das Bargeld, wenn du bereit bist.",
    tap: "Karte ans Terminal halten", give: "Bargeld geben", processing: "Danke. Einen Moment, ich bearbeite deine Zahlung.", cardSuccess: "Vielen Dank. Deine Zahlung war erfolgreich. Hier ist dein Beleg.", cashSuccess: "Vielen Dank. Deine Zahlung war erfolgreich. Hier ist dein Beleg.",
    receipt: "Restaurantbeleg", paymentMethod: "Zahlung", total: "Gesamtbetrag", paid: "Bezahlt", complete: "Vielen Dank. Deine Bestellung ist abgeschlossen. Ich wünsche dir guten Appetit.", practice: "Dies ist nur eine Zahlungsübung. Verwende keine echten Kartendaten und kein echtes Geld.",
  },
  tr: {
    totalQuestion: "Toplam tutar {total}. Nasıl ödemek istersin? Kart veya nakit seçebilirsin.", order: "Siparişin", cardLabel: "Kart", cashLabel: "Nakit", processingLabel: "İşleniyor…", noDrink: "İçecek yok", change: "Para üstü",
    heading: "Ödeme yöntemini seç", question: "Nasıl ödeme yapmak istersin?", card: "Kartla öde", cash: "Nakit öde",
    cardInstruction: "Elbette. Ödemeni tamamlamak için kartını ödeme cihazında kullan.", cashInstruction: "Elbette. Hazır olduğunda nakit ödemeyi yapabilirsin.",
    tap: "Kartını yaklaştır", give: "Parayı ver", processing: "Teşekkürler. Ödemeni işlerken bir an bekle.", cardSuccess: "Teşekkürler. Ödemen başarıyla tamamlandı. İşte fişin.", cashSuccess: "Teşekkürler. Ödemen başarıyla tamamlandı. İşte fişin.",
    receipt: "Restoran fişi", paymentMethod: "Ödeme", total: "Toplam", paid: "Ödendi", complete: "Çok teşekkür ederim. Siparişin tamamlandı. Afiyet olsun.", practice: "Bu ödeme yalnızca bir alıştırmadır. Gerçek kart bilgileri veya para kullanma.",
  },
  pt: {
    totalQuestion: "O total é {total}. Como gostarias de pagar? Podes escolher cartão ou dinheiro.", order: "O teu pedido", cardLabel: "Cartão", cashLabel: "Dinheiro", processingLabel: "A processar…", noDrink: "Sem bebida", change: "Troco",
    heading: "Escolhe como pagar", question: "Como gostarias de pagar?", card: "Pagar com cartão", cash: "Pagar em dinheiro",
    cardInstruction: "Claro. Usa o terminal para concluir o pagamento com cartão.", cashInstruction: "Claro. Entrega o dinheiro quando estiveres pronto.",
    tap: "Aproximar o teu cartão", give: "Entregar dinheiro", processing: "Obrigado. Um momento enquanto processo o teu pagamento.", cardSuccess: "Obrigado. O pagamento foi concluído. Aqui está o teu recibo.", cashSuccess: "Obrigado. O pagamento foi concluído. Aqui está o teu recibo.",
    receipt: "Recibo do restaurante", paymentMethod: "Pagamento", total: "Total", paid: "Pago", complete: "Muito obrigado. O teu pedido está concluído. Espero que gostes da refeição.", practice: "Este pagamento é apenas uma prática. Não uses dados reais de cartão nem dinheiro real.",
  },
  fr: {
    totalQuestion: "Le total est de {total}. Comment souhaites-tu payer ? Tu peux choisir la carte ou les espèces.", order: "Ta commande", cardLabel: "Carte", cashLabel: "Espèces", processingLabel: "En cours…", noDrink: "Sans boisson", change: "Monnaie rendue",
    heading: "Choisis comment payer", question: "Comment aimerais-tu payer ?", card: "Payer par carte", cash: "Payer en espèces",
    cardInstruction: "Bien sûr. Utilise le terminal pour payer par carte.", cashInstruction: "Bien sûr. Donne l'argent quand tu seras prêt.",
    tap: "Approcher ta carte", give: "Donner l'argent", processing: "Merci. Un instant, je m'occupe de ton paiement.", cardSuccess: "Merci. Ton paiement a bien été effectué. Voici ton reçu.", cashSuccess: "Merci. Ton paiement a bien été effectué. Voici ton reçu.",
    receipt: "Reçu du restaurant", paymentMethod: "Paiement", total: "Total", paid: "Payé", complete: "Merci beaucoup. Ta commande est terminée. J'espère que tu apprécieras ton repas.", practice: "Ce paiement est seulement un exercice. N'utilise pas de vraies informations de carte ni d'argent réel.",
  },
};
