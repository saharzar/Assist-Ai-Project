import type { LanguageCode } from "../i18n";

export type PracticeCardText = {
  instructionTitle: string;
  instruction: string;
  flipHint: string;
  flipToBack: string;
  flipToFront: string;
  preview: string;
  holder: string;
  expires: string;
  securityCode: string;
  mismatchError: string;
};

export const practiceCardTranslations: Record<LanguageCode, PracticeCardText> = {
  en: { instructionTitle: "Enter the card details", instruction: "Choose a cardholder name, then copy the card number and expiry date. Flip the card to find its CVV.", flipHint: "Click the card to show the other side.", flipToBack: "Show the back of the card", flipToFront: "Show the front of the card", preview: "Fictional credit card", holder: "Cardholder", expires: "Expires", securityCode: "Security code", mismatchError: "The card number, expiry date, or CVV does not match the displayed card. Please check both sides and try again." },
  es: { instructionTitle: "Introduce los datos de la tarjeta", instruction: "Elige un nombre de titular y copia el número y la fecha de caducidad. Gira la tarjeta para encontrar el CVV.", flipHint: "Haz clic en la tarjeta para ver el otro lado.", flipToBack: "Mostrar el reverso de la tarjeta", flipToFront: "Mostrar el frente de la tarjeta", preview: "Tarjeta de crédito ficticia", holder: "Titular", expires: "Caduca", securityCode: "Código de seguridad", mismatchError: "El número, la fecha de caducidad o el CVV no coinciden con la tarjeta mostrada. Comprueba ambos lados e inténtalo de nuevo." },
  de: { instructionTitle: "Kartendaten eingeben", instruction: "Wählen Sie einen Karteninhabernamen und übernehmen Sie Kartennummer und Ablaufdatum. Drehen Sie die Karte um, um den CVV zu finden.", flipHint: "Klicken Sie auf die Karte, um die andere Seite zu sehen.", flipToBack: "Kartenrückseite anzeigen", flipToFront: "Kartenvorderseite anzeigen", preview: "Fiktive Kreditkarte", holder: "Karteninhaber", expires: "Gültig bis", securityCode: "Sicherheitscode", mismatchError: "Kartennummer, Ablaufdatum oder CVV stimmen nicht mit der angezeigten Karte überein. Prüfen Sie beide Seiten und versuchen Sie es erneut." },
  tr: { instructionTitle: "Kart bilgilerini girin", instruction: "Kart sahibi için bir ad seçin, ardından kart numarasını ve son kullanma tarihini kopyalayın. CVV kodunu görmek için kartı çevirin.", flipHint: "Diğer tarafı görmek için karta tıklayın.", flipToBack: "Kartın arka yüzünü göster", flipToFront: "Kartın ön yüzünü göster", preview: "Kredi kartı", holder: "Kart sahibi", expires: "Son kullanım", securityCode: "Güvenlik kodu", mismatchError: "Kart numarası, son kullanma tarihi veya CVV gösterilen kartla eşleşmiyor. Kartın iki tarafını da kontrol edip tekrar deneyin." },
  pt: { instructionTitle: "Introduza os dados do cartão", instruction: "Escolha um nome do titular e copie o número e a validade. Vire o cartão para encontrar o CVV.", flipHint: "Clique no cartão para ver o outro lado.", flipToBack: "Mostrar o verso do cartão", flipToFront: "Mostrar a frente do cartão", preview: "Cartão de crédito fictício", holder: "Titular", expires: "Validade", securityCode: "Código de segurança", mismatchError: "O número, a validade ou o CVV não correspondem ao cartão apresentado. Verifique os dois lados e tente novamente." },
  fr: { instructionTitle: "Saisissez les données de la carte", instruction: "Choisissez un nom de titulaire, puis recopiez le numéro et la date d’expiration. Retournez la carte pour trouver le CVV.", flipHint: "Cliquez sur la carte pour voir l’autre face.", flipToBack: "Afficher le dos de la carte", flipToFront: "Afficher le devant de la carte", preview: "Carte de crédit fictive", holder: "Titulaire", expires: "Expiration", securityCode: "Code de sécurité", mismatchError: "Le numéro, la date d’expiration ou le CVV ne correspondent pas à la carte affichée. Vérifiez les deux faces et réessayez." },
};
