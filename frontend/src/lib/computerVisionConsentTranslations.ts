import type { LanguageCode } from "../i18n";

type ComputerVisionConsentText = {
  legend: string;
  description: string;
  yes: string;
  no: string;
  dataNote: string;
  validation: string;
};

export const computerVisionConsentTranslations: Record<LanguageCode, ComputerVisionConsentText> = {
  en: {
    legend: "Should my face and eye movement data be saved?",
    description: "During the scenario, the direction of your face and eyes may be analyzed. No video or photos will be saved. Only data created from the analysis will be stored.",
    yes: "Yes, save the data",
    no: "No, do not save the data",
    dataNote: "This choice does not allow video or photo recording.",
    validation: "Please choose whether your analysis data can be saved.",
  },
  es: {
    legend: "¿Quieres que se guarden los datos sobre los movimientos de tu rostro y ojos?",
    description: "Durante el escenario, se puede analizar hacia dónde miran tu rostro y tus ojos. No se guardarán vídeos ni fotos. Solo se guardarán los datos obtenidos del análisis.",
    yes: "Sí, guardar los datos",
    no: "No, no guardar los datos",
    dataNote: "Esta opción no permite grabar vídeos ni tomar fotos.",
    validation: "Elige si se pueden guardar los datos del análisis.",
  },
  de: {
    legend: "Sollen Daten zu meinen Gesichts- und Augenbewegungen gespeichert werden?",
    description: "Während des Szenarios kann analysiert werden, wohin dein Gesicht und deine Augen gerichtet sind. Es werden keine Videos oder Fotos gespeichert. Gespeichert werden nur die aus der Analyse gewonnenen Daten.",
    yes: "Ja, Daten speichern",
    no: "Nein, Daten nicht speichern",
    dataNote: "Mit dieser Auswahl erlaubst du keine Video- oder Fotoaufnahmen.",
    validation: "Bitte wähle aus, ob deine Analysedaten gespeichert werden dürfen.",
  },
  tr: {
    legend: "Yüzüm ve göz hareketlerimle ilgili veriler kaydedilsin mi?",
    description: "Senaryo sırasında yüzünün ve gözlerinin baktığı yön analiz edilebilir. Video veya fotoğraf kaydedilmez. Yalnızca analizden elde edilen veriler saklanır.",
    yes: "Evet, verileri kaydet",
    no: "Hayır, verileri kaydetme",
    dataNote: "Bu seçim video veya fotoğraf kaydına izin vermez.",
    validation: "Lütfen analiz verilerinizin kaydedilip kaydedilemeyeceğini seçin.",
  },
  pt: {
    legend: "Os dados sobre os movimentos do meu rosto e dos meus olhos devem ser guardados?",
    description: "Durante o cenário, a direção do teu rosto e dos teus olhos pode ser analisada. Não serão guardados vídeos nem fotografias. Só serão guardados os dados resultantes da análise.",
    yes: "Sim, guardar os dados",
    no: "Não, não guardar os dados",
    dataNote: "Esta opção não permite gravar vídeos nem tirar fotografias.",
    validation: "Escolha se os dados da análise podem ser guardados.",
  },
  fr: {
    legend: "Faut-il enregistrer les données sur les mouvements de mon visage et de mes yeux ?",
    description: "Pendant le scénario, la direction de votre visage et de vos yeux peut être analysée. Aucune vidéo ni photo ne sera enregistrée. Seules les données issues de l’analyse seront conservées.",
    yes: "Oui, enregistrer les données",
    no: "Non, ne pas enregistrer les données",
    dataNote: "Ce choix n’autorise pas l’enregistrement de vidéos ni de photos.",
    validation: "Veuillez choisir si les données de votre analyse peuvent être enregistrées.",
  },
};
