import type { LanguageCode } from "../i18n";

export type CardHintField = "cardholderName" | "cardNumber" | "expiry" | "cvv";

export const cardHintTranslations: Record<LanguageCode, {
  show: string;
  hide: string;
  help: string;
  stuckMessage: string;
  fields: Record<CardHintField, string>;
}> = {
  en: { show: "Show hints", hide: "Hide hints", help: "Select a field to see where its information is located on the card.", stuckMessage: "If you are stuck or unsure what to enter, select Show hints for help.", fields: { cardholderName: "Copy this cardholder name", cardNumber: "Copy this card number", expiry: "Copy this expiry date", cvv: "Copy this CVV code" } },
  es: { show: "Mostrar pistas", hide: "Ocultar pistas", help: "Selecciona un campo para ver dónde está la información en la tarjeta.", stuckMessage: "Si tienes dudas sobre qué escribir, selecciona Mostrar pistas para recibir ayuda.", fields: { cardholderName: "Copia este titular", cardNumber: "Copia este número de tarjeta", expiry: "Copia esta fecha de caducidad", cvv: "Copia este código CVV" } },
  de: { show: "Hinweise anzeigen", hide: "Hinweise ausblenden", help: "Wählen Sie ein Feld aus, um die passende Stelle auf der Karte zu sehen.", stuckMessage: "Wenn Sie unsicher sind, was Sie eingeben sollen, wählen Sie Hinweise anzeigen.", fields: { cardholderName: "Diesen Karteninhaber übernehmen", cardNumber: "Diese Kartennummer übernehmen", expiry: "Dieses Ablaufdatum übernehmen", cvv: "Diesen CVV-Code übernehmen" } },
  tr: { show: "İpuçlarını göster", hide: "İpuçlarını gizle", help: "Bilginin kartta nerede olduğunu görmek için bir alana dokunun.", stuckMessage: "Takılırsanız veya ne yazacağınızdan emin değilseniz yardım için İpuçlarını göster seçeneğine dokunun.", fields: { cardholderName: "Bu kart sahibi adını yazın", cardNumber: "Bu kart numarasını yazın", expiry: "Bu son kullanma tarihini yazın", cvv: "Bu CVV kodunu yazın" } },
  pt: { show: "Mostrar dicas", hide: "Ocultar dicas", help: "Selecione um campo para ver onde se encontra a informação no cartão.", stuckMessage: "Se tiver dúvidas sobre o que escrever, selecione Mostrar dicas para obter ajuda.", fields: { cardholderName: "Copie este nome do titular", cardNumber: "Copie este número do cartão", expiry: "Copie esta data de validade", cvv: "Copie este código CVV" } },
  fr: { show: "Afficher les indices", hide: "Masquer les indices", help: "Sélectionnez un champ pour voir où se trouve l’information sur la carte.", stuckMessage: "Si vous ne savez pas quoi saisir, sélectionnez Afficher les indices pour obtenir de l’aide.", fields: { cardholderName: "Recopiez ce nom du titulaire", cardNumber: "Recopiez ce numéro de carte", expiry: "Recopiez cette date d’expiration", cvv: "Recopiez ce code CVV" } },
};
