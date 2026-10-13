import type { LanguageCode } from "../i18n";

type ComputerVisionConsentText = {
  legend: string; description: string; yes: string; no: string;
  cameraChecking: string; cameraUnavailable: string; cameraUnavailableMessage: string; cameraRetry: string;
};

export const computerVisionConsentTranslations: Record<LanguageCode, ComputerVisionConsentText> = {
  en: {
    legend: "Camera analysis",
    description: "During the activities, the system can analyze your face and eye direction. No video or photos will be saved. Would you like the analysis data to be saved during this session?",
    yes: "Yes, save my analysis data",
    no: "No, do not save my analysis data",
    cameraChecking: "Checking your camera",
    cameraUnavailable: "Camera not available",
    cameraUnavailableMessage: "We cannot access your camera. Please check your camera and camera permission, then try again.",
    cameraRetry: "Try again",
  },
  es: {
    legend: "Análisis con la cámara",
    description: "Durante las actividades, el sistema puede analizar la dirección de tu rostro y tus ojos. No se guardarán vídeos ni fotos. ¿Quieres que se guarden los datos del análisis durante esta sesión?",
    yes: "Sí, guardar mis datos de análisis",
    no: "No, no guardar mis datos de análisis",
    cameraChecking: "Comprobando tu cámara",
    cameraUnavailable: "Cámara no disponible",
    cameraUnavailableMessage: "No podemos acceder a tu cámara. Comprueba la cámara y el permiso de acceso. Después, inténtalo de nuevo.",
    cameraRetry: "Intentar de nuevo",
  },
  de: {
    legend: "Kameraanalyse",
    description: "Während der Aktivitäten kann das System die Richtung deines Gesichts und deiner Augen analysieren. Es werden keine Videos oder Fotos gespeichert. Möchtest du, dass die Analysedaten während dieser Sitzung gespeichert werden?",
    yes: "Ja, meine Analysedaten speichern",
    no: "Nein, meine Analysedaten nicht speichern",
    cameraChecking: "Deine Kamera wird geprüft",
    cameraUnavailable: "Kamera nicht verfügbar",
    cameraUnavailableMessage: "Wir können nicht auf deine Kamera zugreifen. Bitte prüfe deine Kamera und die Zugriffsberechtigung. Versuche es dann erneut.",
    cameraRetry: "Erneut versuchen",
  },
  tr: {
    legend: "Kamera analizi",
    description: "Etkinlikler sırasında sistem, yüzünün ve gözlerinin baktığı yönü analiz edebilir. Video veya fotoğraf kaydedilmez. Bu oturum boyunca analiz verilerinin kaydedilmesini ister misin?",
    yes: "Evet, analiz verilerimi kaydet",
    no: "Hayır, analiz verilerimi kaydetme",
    cameraChecking: "Kameran kontrol ediliyor",
    cameraUnavailable: "Kameraya erişilemiyor",
    cameraUnavailableMessage: "Kamerana erişemiyoruz. Lütfen kameranı ve kamera erişim iznini kontrol et. Sonra tekrar dene.",
    cameraRetry: "Tekrar dene",
  },
  pt: {
    legend: "Análise com a câmara",
    description: "Durante as atividades, o sistema pode analisar a direção do teu rosto e dos teus olhos. Não serão guardados vídeos nem fotografias. Queres que os dados da análise sejam guardados durante esta sessão?",
    yes: "Sim, guardar os meus dados de análise",
    no: "Não, não guardar os meus dados de análise",
    cameraChecking: "A verificar a tua câmara",
    cameraUnavailable: "Câmara indisponível",
    cameraUnavailableMessage: "Não conseguimos aceder à tua câmara. Verifica a câmara e a permissão de acesso. Depois, tenta novamente.",
    cameraRetry: "Tentar novamente",
  },
  fr: {
    legend: "Analyse avec la caméra",
    description: "Pendant les activités, le système peut analyser la direction de votre visage et de vos yeux. Aucune vidéo ni photo ne sera enregistrée. Souhaitez-vous que les données de l’analyse soient enregistrées pendant cette session ?",
    yes: "Oui, enregistrer mes données d’analyse",
    no: "Non, ne pas enregistrer mes données d’analyse",
    cameraChecking: "Vérification de votre caméra",
    cameraUnavailable: "Caméra indisponible",
    cameraUnavailableMessage: "Nous ne pouvons pas accéder à votre caméra. Vérifiez votre caméra et l’autorisation d’accès, puis réessayez.",
    cameraRetry: "Réessayer",
  },
};
