import type { LanguageCode } from "../i18n";

type ComputerVisionConsentText = { legend: string; description: string; yes: string; no: string };

export const computerVisionConsentTranslations: Record<LanguageCode, ComputerVisionConsentText> = {
  en: {
    legend: "Camera analysis",
    description: "During the activities, the system can analyze your face and eye direction. No video or photos will be saved. Would you like the analysis data to be saved during this session?",
    yes: "Yes, save my analysis data",
    no: "No, do not save my analysis data",
  },
  es: {
    legend: "Análisis con la cámara",
    description: "Durante las actividades, el sistema puede analizar la dirección de tu rostro y tus ojos. No se guardarán vídeos ni fotos. ¿Quieres que se guarden los datos del análisis durante esta sesión?",
    yes: "Sí, guardar mis datos de análisis",
    no: "No, no guardar mis datos de análisis",
  },
  de: {
    legend: "Kameraanalyse",
    description: "Während der Aktivitäten kann das System die Richtung deines Gesichts und deiner Augen analysieren. Es werden keine Videos oder Fotos gespeichert. Möchtest du, dass die Analysedaten während dieser Sitzung gespeichert werden?",
    yes: "Ja, meine Analysedaten speichern",
    no: "Nein, meine Analysedaten nicht speichern",
  },
  tr: {
    legend: "Kamera analizi",
    description: "Etkinlikler sırasında sistem, yüzünün ve gözlerinin baktığı yönü analiz edebilir. Video veya fotoğraf kaydedilmez. Bu oturum boyunca analiz verilerinin kaydedilmesini ister misin?",
    yes: "Evet, analiz verilerimi kaydet",
    no: "Hayır, analiz verilerimi kaydetme",
  },
  pt: {
    legend: "Análise com a câmara",
    description: "Durante as atividades, o sistema pode analisar a direção do teu rosto e dos teus olhos. Não serão guardados vídeos nem fotografias. Queres que os dados da análise sejam guardados durante esta sessão?",
    yes: "Sim, guardar os meus dados de análise",
    no: "Não, não guardar os meus dados de análise",
  },
  fr: {
    legend: "Analyse avec la caméra",
    description: "Pendant les activités, le système peut analyser la direction de votre visage et de vos yeux. Aucune vidéo ni photo ne sera enregistrée. Souhaitez-vous que les données de l’analyse soient enregistrées pendant cette session ?",
    yes: "Oui, enregistrer mes données d’analyse",
    no: "Non, ne pas enregistrer mes données d’analyse",
  },
};
