import type { LanguageCode } from "../i18n";

export type CardHintField = "cardNumber" | "expiry" | "cvv";

export const cardHintTranslations: Record<LanguageCode, {
  show: string;
  hide: string;
  help: string;
  stuckMessage: string;
  fields: Record<CardHintField, string>;
}> = {
  en: { show: "Show hints", hide: "Hide hints", help: "Select a card detail field to see where its information is located.", stuckMessage: "If you are stuck or unsure what to enter, select Show hints for help.", fields: { cardNumber: "Copy this card number", expiry: "Copy this expiry date", cvv: "Copy this CVV code" } },
  es: { show: "Mostrar pistas", hide: "Ocultar pistas", help: "Selecciona un campo de la tarjeta para ver dónde está la información.", stuckMessage: "Si tienes dudas sobre qué escribir, selecciona Mostrar pistas para recibir ayuda.", fields: { cardNumber: "Copia este número de tarjeta", expiry: "Copia esta fecha de caducidad", cvv: "Copia este código CVV" } },
  de: { show: "Hinweise anzeigen", hide: "Hinweise ausblenden", help: "Wählen Sie ein Kartendatenfeld aus, um die passende Stelle zu sehen.", stuckMessage: "Wenn Sie unsicher sind, was Sie eingeben sollen, wählen Sie Hinweise anzeigen.", fields: { cardNumber: "Diese Kartennummer übernehmen", expiry: "Dieses Ablaufdatum übernehmen", cvv: "Diesen CVV-Code übernehmen" } },
  tr: { show: "İpuçlarını göster", hide: "İpuçlarını gizle", help: "Bilginin yerini görmek için bir kart bilgisi alanına dokunun.", stuckMessage: "Takılırsanız veya ne yazacağınızdan emin değilseniz yardım için İpuçlarını göster seçeneğine dokunun.", fields: { cardNumber: "Bu kart numarasını yazın", expiry: "Bu son kullanma tarihini yazın", cvv: "Bu CVV kodunu yazın" } },
  pt: { show: "Mostrar dicas", hide: "Ocultar dicas", help: "Selecione um campo dos dados do cartão para ver onde se encontra a informação.", stuckMessage: "Se tiver dúvidas sobre o que escrever, selecione Mostrar dicas para obter ajuda.", fields: { cardNumber: "Copie este número do cartão", expiry: "Copie esta data de validade", cvv: "Copie este código CVV" } },
  fr: { show: "Afficher les indices", hide: "Masquer les indices", help: "Sélectionnez un champ de la carte pour localiser l’information.", stuckMessage: "Si vous ne savez pas quoi saisir, sélectionnez Afficher les indices pour obtenir de l’aide.", fields: { cardNumber: "Recopiez ce numéro de carte", expiry: "Recopiez cette date d’expiration", cvv: "Recopiez ce code CVV" } },
};
