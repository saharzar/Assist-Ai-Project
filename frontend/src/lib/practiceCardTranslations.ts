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
  en: { instructionTitle: "Copy the card details", instruction: "Enter the card number, expiry date, and cardholder name shown on this card. Flip the card to find its CVV.", flipHint: "Click the card to show the other side.", flipToBack: "Show the back of the card", flipToFront: "Show the front of the card", preview: "Fictional credit card", holder: "Cardholder", expires: "Expires", securityCode: "Security code", mismatchError: "The information does not match the displayed card. Please check both sides and try again." },
  es: { instructionTitle: "Copia los datos de la tarjeta", instruction: "Introduce el número, la fecha de caducidad y el titular que aparecen en la tarjeta. Gírala para encontrar el CVV.", flipHint: "Haz clic en la tarjeta para ver el otro lado.", flipToBack: "Mostrar el reverso de la tarjeta", flipToFront: "Mostrar el frente de la tarjeta", preview: "Tarjeta de crédito ficticia", holder: "Titular", expires: "Caduca", securityCode: "Código de seguridad", mismatchError: "Los datos no coinciden con la tarjeta mostrada. Comprueba ambos lados e inténtalo de nuevo." },
  de: { instructionTitle: "Kartendaten übertragen", instruction: "Geben Sie Kartennummer, Ablaufdatum und Karteninhaber wie angezeigt ein. Drehen Sie die Karte um, um den CVV zu finden.", flipHint: "Klicken Sie auf die Karte, um die andere Seite zu sehen.", flipToBack: "Kartenrückseite anzeigen", flipToFront: "Kartenvorderseite anzeigen", preview: "Fiktive Kreditkarte", holder: "Karteninhaber", expires: "Gültig bis", securityCode: "Sicherheitscode", mismatchError: "Die Angaben stimmen nicht mit der angezeigten Karte überein. Prüfen Sie beide Seiten und versuchen Sie es erneut." },
  tr: { instructionTitle: "Kart bilgilerini kopyalayın", instruction: "Kartta görünen kart numarasını, son kullanma tarihini ve kart sahibinin adını girin. CVV kodunu görmek için kartı çevirin.", flipHint: "Diğer tarafı görmek için karta tıklayın.", flipToBack: "Kartın arka yüzünü göster", flipToFront: "Kartın ön yüzünü göster", preview: "Kredi kartı", holder: "Kart sahibi", expires: "Son kullanım", securityCode: "Güvenlik kodu", mismatchError: "Bilgiler gösterilen kartla eşleşmiyor. Kartın iki tarafını da kontrol edip tekrar deneyin." },
  pt: { instructionTitle: "Copie os dados do cartão", instruction: "Introduza o número, a validade e o nome do titular apresentados no cartão. Vire o cartão para encontrar o CVV.", flipHint: "Clique no cartão para ver o outro lado.", flipToBack: "Mostrar o verso do cartão", flipToFront: "Mostrar a frente do cartão", preview: "Cartão de crédito fictício", holder: "Titular", expires: "Validade", securityCode: "Código de segurança", mismatchError: "Os dados não correspondem ao cartão apresentado. Verifique os dois lados e tente novamente." },
  fr: { instructionTitle: "Recopiez les données de la carte", instruction: "Saisissez le numéro, la date d’expiration et le titulaire affichés. Retournez la carte pour trouver le CVV.", flipHint: "Cliquez sur la carte pour voir l’autre face.", flipToBack: "Afficher le dos de la carte", flipToFront: "Afficher le devant de la carte", preview: "Carte de crédit fictive", holder: "Titulaire", expires: "Expiration", securityCode: "Code de sécurité", mismatchError: "Les informations ne correspondent pas à la carte affichée. Vérifiez les deux faces et réessayez." },
};
