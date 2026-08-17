import type { LanguageCode } from "../i18n";

export const billLoginSecurityTranslations: Record<LanguageCode, {
  incorrect: (attempts: number) => string;
  locked: string;
}> = {
  en: { incorrect: (attempts) => `The password does not match. You have ${attempts} attempt${attempts === 1 ? "" : "s"} left.`, locked: "The password was entered incorrectly three times. For your security, access has ended. You will return to the introduction page." },
  es: { incorrect: (attempts) => `La contraseña no coincide. Te queda${attempts === 1 ? "" : "n"} ${attempts} intento${attempts === 1 ? "" : "s"}.`, locked: "La contraseña se ha introducido incorrectamente tres veces. Por seguridad, el acceso ha finalizado. Volverás a la página de introducción." },
  de: { incorrect: (attempts) => `Das Passwort stimmt nicht. Sie haben noch ${attempts} Versuch${attempts === 1 ? "" : "e"}.`, locked: "Das Passwort wurde dreimal falsch eingegeben. Zu Ihrer Sicherheit wurde der Zugriff beendet. Sie kehren zur Einführungsseite zurück." },
  tr: { incorrect: (attempts) => `Parola eşleşmiyor. ${attempts} deneme hakkınız kaldı.`, locked: "Parola üç kez yanlış girildi. Güvenliğiniz için erişim sonlandırıldı. Tanıtım sayfasına yönlendirileceksiniz." },
  pt: { incorrect: (attempts) => `A palavra-passe não corresponde. Ainda tem ${attempts} tentativa${attempts === 1 ? "" : "s"}.`, locked: "A palavra-passe foi introduzida incorretamente três vezes. Por segurança, o acesso terminou. Voltará à página de introdução." },
  fr: { incorrect: (attempts) => `Le mot de passe ne correspond pas. Il vous reste ${attempts} tentative${attempts === 1 ? "" : "s"}.`, locked: "Le mot de passe a été saisi incorrectement trois fois. Pour votre sécurité, l’accès est terminé. Vous allez revenir à la page d’introduction." },
};
