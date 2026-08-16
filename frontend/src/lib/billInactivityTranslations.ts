import type { LanguageCode } from "../i18n";

export const billInactivityTranslations: Record<LanguageCode, {
  warningTitle: string;
  warning: (seconds: number) => string;
  timeoutTitle: string;
  timeoutMessage: string;
  timeoutAssistant: string;
}> = {
  en: { warningTitle: "Inactivity warning", warning: (seconds) => `Warning: Your session will end in ${seconds} seconds unless you continue.`, timeoutTitle: "Session timed out", timeoutMessage: "Your session ended because there was no activity. You will return to the introduction page.", timeoutAssistant: "Your session has ended due to inactivity. You will now return to the introduction page." },
  es: { warningTitle: "Aviso de inactividad", warning: (seconds) => `Aviso: Tu sesión terminará en ${seconds} segundos si no continúas.`, timeoutTitle: "Sesión caducada", timeoutMessage: "Tu sesión terminó porque no hubo actividad. Volverás a la página de introducción.", timeoutAssistant: "Tu sesión terminó por inactividad. Ahora volverás a la página de introducción." },
  de: { warningTitle: "Inaktivitätswarnung", warning: (seconds) => `Warnung: Ihre Sitzung endet in ${seconds} Sekunden, wenn Sie nicht fortfahren.`, timeoutTitle: "Sitzung abgelaufen", timeoutMessage: "Ihre Sitzung wurde wegen Inaktivität beendet. Sie kehren zur Einführungsseite zurück.", timeoutAssistant: "Ihre Sitzung wurde wegen Inaktivität beendet. Sie kehren jetzt zur Einführungsseite zurück." },
  tr: { warningTitle: "Hareketsizlik uyarısı", warning: (seconds) => `UYARI: Devam etmezseniz oturumunuz ${seconds} saniye içinde sonlandırılacaktır.`, timeoutTitle: "Oturum zaman aşımına uğradı", timeoutMessage: "İşlem yapılmadığı için oturumunuz sonlandırıldı. Tanıtım sayfasına yönlendirileceksiniz.", timeoutAssistant: "İşlem yapılmadığı için oturumunuz sonlandırıldı. Şimdi tanıtım sayfasına yönlendirileceksiniz." },
  pt: { warningTitle: "Aviso de inatividade", warning: (seconds) => `Aviso: A sua sessão terminará em ${seconds} segundos se não continuar.`, timeoutTitle: "Sessão expirada", timeoutMessage: "A sua sessão terminou por inatividade. Voltará à página de introdução.", timeoutAssistant: "A sua sessão terminou por inatividade. Voltará agora à página de introdução." },
  fr: { warningTitle: "Avertissement d’inactivité", warning: (seconds) => `Attention : votre session se terminera dans ${seconds} secondes si vous ne continuez pas.`, timeoutTitle: "Session expirée", timeoutMessage: "Votre session s’est terminée pour cause d’inactivité. Vous allez revenir à la page d’introduction.", timeoutAssistant: "Votre session s’est terminée pour cause d’inactivité. Vous allez maintenant revenir à la page d’introduction." },
};
