import type { LanguageCode } from "../i18n";

export const billLoginSecurityTranslations: Record<LanguageCode, {
  incorrect: (attempts: number) => string;
  locked: string;
}> = {
  en: { incorrect: (attempts) => `The username or password is incorrect. You have ${attempts} attempt${attempts === 1 ? "" : "s"} left.`, locked: "The login details were entered incorrectly three times. For your security, access has ended. You will return to the introduction page." },
  es: { incorrect: (attempts) => `El usuario o la contraseña son incorrectos. Te queda${attempts === 1 ? "" : "n"} ${attempts} intento${attempts === 1 ? "" : "s"}.`, locked: "Los datos de acceso se introdujeron incorrectamente tres veces. Por seguridad, el acceso ha finalizado. Volverás a la página de introducción." },
  de: { incorrect: (attempts) => `Benutzername oder Passwort ist falsch. Sie haben noch ${attempts} Versuch${attempts === 1 ? "" : "e"}.`, locked: "Die Anmeldedaten wurden dreimal falsch eingegeben. Zu Ihrer Sicherheit wurde der Zugriff beendet. Sie kehren zur Einführungsseite zurück." },
  tr: { incorrect: (attempts) => `Kullanıcı adı veya parola yanlış. ${attempts} deneme hakkınız kaldı.`, locked: "Giriş bilgileri üç kez yanlış girildi. Güvenliğiniz için erişim sonlandırıldı. Tanıtım sayfasına yönlendirileceksiniz." },
  pt: { incorrect: (attempts) => `O utilizador ou a palavra-passe está incorreto. Ainda tem ${attempts} tentativa${attempts === 1 ? "" : "s"}.`, locked: "Os dados de acesso foram introduzidos incorretamente três vezes. Por segurança, o acesso terminou. Voltará à página de introdução." },
  fr: { incorrect: (attempts) => `L’identifiant ou le mot de passe est incorrect. Il vous reste ${attempts} tentative${attempts === 1 ? "" : "s"}.`, locked: "Les informations de connexion ont été saisies incorrectement trois fois. Pour votre sécurité, l’accès est terminé. Vous allez revenir à la page d’introduction." },
};
