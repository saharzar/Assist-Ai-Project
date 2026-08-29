import type { LanguageCode } from "../i18n";

type AtmSetupText = {
  eyebrow: string;
  title: string;
  description: string;
  fullName: string;
  fullNamePlaceholder: string;
  holdName: string;
  listening: string;
  nameError: string;
  pinLabel: string;
  showPin: string;
  hidePin: string;
  holdPin: string;
  pinHint: string;
  pinError: string;
  start: string;
  back: string;
};

export const atmSetupTranslations: Record<LanguageCode, AtmSetupText> = {
  en: { eyebrow: "ATM setup", title: "Set up your ATM session", description: "Enter your name and create a four-digit PIN. This information is used only for your current ATM session.", fullName: "Full name", fullNamePlaceholder: "Enter your full name", holdName: "Hold to say your name", listening: "Listening…", nameError: "Please enter your full name.", pinLabel: "Create a 4-digit PIN", showPin: "Show PIN", hidePin: "Hide PIN", holdPin: "Hold to say your PIN", pinHint: "Use exactly four numbers.", pinError: "Your PIN must contain exactly four numbers.", start: "Start ATM session", back: "Back to introduction" },
  es: { eyebrow: "Configuración del cajero", title: "Configura tu sesión de cajero", description: "Introduce tu nombre y crea un PIN de cuatro dígitos. Esta información se utilizará únicamente durante esta sesión.", fullName: "Nombre completo", fullNamePlaceholder: "Introduce tu nombre completo", holdName: "Mantén pulsado para decir tu nombre", listening: "Escuchando…", nameError: "Introduce tu nombre completo.", pinLabel: "Crea un PIN de 4 dígitos", showPin: "Mostrar PIN", hidePin: "Ocultar PIN", holdPin: "Mantén pulsado para decir tu PIN", pinHint: "Utiliza exactamente cuatro números.", pinError: "El PIN debe contener exactamente cuatro números.", start: "Iniciar sesión de cajero", back: "Volver a la introducción" },
  de: { eyebrow: "Geldautomat einrichten", title: "Richten Sie Ihre Geldautomat-Sitzung ein", description: "Geben Sie Ihren Namen ein und erstellen Sie eine vierstellige PIN. Diese Angaben werden nur für die aktuelle Sitzung verwendet.", fullName: "Vollständiger Name", fullNamePlaceholder: "Vollständigen Namen eingeben", holdName: "Gedrückt halten, um den Namen zu sagen", listening: "Höre zu…", nameError: "Bitte geben Sie Ihren vollständigen Namen ein.", pinLabel: "Vierstellige PIN erstellen", showPin: "PIN anzeigen", hidePin: "PIN ausblenden", holdPin: "Gedrückt halten, um die PIN zu sagen", pinHint: "Verwenden Sie genau vier Ziffern.", pinError: "Die PIN muss genau vier Ziffern enthalten.", start: "Geldautomat-Sitzung starten", back: "Zurück zur Einführung" },
  tr: { eyebrow: "ATM kurulumu", title: "ATM oturumunuzu hazırlayın", description: "Adınızı girin ve dört haneli bir PIN oluşturun. Bu bilgiler yalnızca mevcut ATM oturumunuz için kullanılır.", fullName: "Ad soyad", fullNamePlaceholder: "Adınızı ve soyadınızı girin", holdName: "Adınızı söylemek için basılı tutun", listening: "Dinleniyor…", nameError: "Lütfen adınızı ve soyadınızı girin.", pinLabel: "4 haneli PIN oluşturun", showPin: "PIN'i göster", hidePin: "PIN'i gizle", holdPin: "PIN'inizi söylemek için basılı tutun", pinHint: "Tam olarak dört rakam kullanın.", pinError: "PIN'iniz tam olarak dört rakam içermelidir.", start: "ATM oturumunu başlat", back: "Tanıtıma dön" },
  pt: { eyebrow: "Configuração do ATM", title: "Configure a sua sessão no ATM", description: "Introduza o seu nome e crie um PIN de quatro dígitos. Estes dados são utilizados apenas durante a sessão atual.", fullName: "Nome completo", fullNamePlaceholder: "Introduza o seu nome completo", holdName: "Mantenha premido para dizer o seu nome", listening: "A ouvir…", nameError: "Introduza o seu nome completo.", pinLabel: "Crie um PIN de 4 dígitos", showPin: "Mostrar PIN", hidePin: "Ocultar PIN", holdPin: "Mantenha premido para dizer o seu PIN", pinHint: "Utilize exatamente quatro números.", pinError: "O PIN deve conter exatamente quatro números.", start: "Iniciar sessão no ATM", back: "Voltar à introdução" },
  fr: { eyebrow: "Configuration du distributeur", title: "Configurez votre session au distributeur", description: "Saisissez votre nom et créez un code PIN à quatre chiffres. Ces informations sont utilisées uniquement pendant la session actuelle.", fullName: "Nom complet", fullNamePlaceholder: "Saisissez votre nom complet", holdName: "Maintenez pour prononcer votre nom", listening: "Écoute…", nameError: "Veuillez saisir votre nom complet.", pinLabel: "Créez un code PIN à 4 chiffres", showPin: "Afficher le PIN", hidePin: "Masquer le PIN", holdPin: "Maintenez pour prononcer votre PIN", pinHint: "Utilisez exactement quatre chiffres.", pinError: "Le PIN doit contenir exactement quatre chiffres.", start: "Démarrer la session au distributeur", back: "Retour à l’introduction" },
};
