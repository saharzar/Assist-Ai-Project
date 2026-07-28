import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Scenario } from "./types/scenario";

export type LanguageCode = "en" | "es" | "de" | "tr" | "pt" | "fr";

type TranslationContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  translateScenario: (scenario: Scenario) => Scenario;
};

type TranslationKey =
  | "login"
  | "createAccount"
  | "continueAsGuest"
  | "viewScenarios"
  | "scenarios"
  | "profile"
  | "role"
  | "logout"
  | "fullName"
  | "email"
  | "password"
  | "confirmPassword"
  | "passwordMismatch"
  | "showPassword"
  | "hidePassword"
  | "preferredLanguage"
  | "userCategory"
  | "personalUser"
  | "familyCaregiver"
  | "institution"
  | "professional"
  | "registerTitle"
  | "registerSubtitle"
  | "loginTitle"
  | "loginSubtitle"
  | "guestTitle"
  | "guestQuestion"
  | "saveProgress"
  | "continueWithoutSaving"
  | "profileTitle"
  | "guestMode"
  | "saveProgressLabel"
  | "yes"
  | "no"
  | "authFormError"
  | "accountRequestSent"
  | "pendingApprovalMessage"
  | "deniedAccountMessage"
  | "suspendedAccountMessage"
  | "accessDenied"
  | "adminUsers"
  | "approvalStatus"
  | "createdDate"
  | "pending"
  | "approved"
  | "denied"
  | "suspended"
  | "all"
  | "approve"
  | "activate"
  | "deny"
  | "suspend"
  | "userApprovedEmailProcessed"
  | "userActivatedEmailProcessed"
  | "userDeniedEmailProcessed"
  | "userSuspendedEmailProcessed"
  | "confirmDenyTitle"
  | "confirmDenyBody"
  | "cancel"
  | "confirmDeny"
  | "rejectionReason"
  | "viewPendingAccounts"
  | "passwordHelp"
  | "loginRequired"
  | "heroTitle"
  | "heroSubtitle"
  | "stepFoundation"
  | "footerStatus"
  | "scenarioCatalogueTitle"
  | "scenarioCatalogueSubtitle"
  | "loadingScenarios"
  | "backendError"
  | "openScenario"
  | "available"
  | "comingSoon"
  | "scenarioNotFound"
  | "scenarioNotFoundBody"
  | "scenarioNextStep"
  | "backToScenarios"
  | "voiceCredits"
  | "speechCredits"
  | "language";

type ScenarioText = Pick<Scenario, "title" | "description">;

export const languages: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "tr", label: "Turkish" },
  { code: "pt", label: "Portuguese" },
  { code: "fr", label: "French" },
];

const uiTranslations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    login: "Login",
    createAccount: "Create Account",
    continueAsGuest: "Continue as Guest",
    viewScenarios: "View Scenarios",
    scenarios: "Scenarios",
    profile: "Profile",
    role: "Role",
    logout: "Logout",
    fullName: "Full name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    passwordMismatch: "Passwords do not match.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    preferredLanguage: "Preferred language",
    userCategory: "User category",
    personalUser: "Personal User",
    familyCaregiver: "Family / Caregiver",
    institution: "Institution / Organization",
    professional: "Professional / Educator",
    registerTitle: "Create your account",
    registerSubtitle: "Choose your user category so ASSIST-AI can prepare the right experience later.",
    loginTitle: "Welcome back",
    loginSubtitle: "Log in to continue to your scenario catalogue.",
    guestTitle: "Continue as Guest",
    guestQuestion: "Do you want to save your progress during this session?",
    saveProgress: "Continue and save progress",
    continueWithoutSaving: "Continue without saving",
    profileTitle: "Profile",
    guestMode: "Guest mode",
    saveProgressLabel: "Save progress",
    yes: "Yes",
    no: "No",
    authFormError: "Please check your information and try again.",
    accountRequestSent: "Your account request has been sent for admin approval. You will receive a notification after review.",
    pendingApprovalMessage: "Your account is waiting for admin approval.",
    deniedAccountMessage: "Your account request was not approved.",
    suspendedAccountMessage: "Your account is suspended.",
    accessDenied: "Access denied.",
    adminUsers: "Admin Dashboard",
    approvalStatus: "Approval status",
    createdDate: "Created date",
    pending: "Pending",
    approved: "Approved",
    denied: "Denied",
    suspended: "Suspended",
    all: "All",
    approve: "Approve",
    activate: "Activate",
    deny: "Deny",
    suspend: "Suspend",
    userApprovedEmailProcessed: "User approved and notification email processed.",
    userActivatedEmailProcessed: "User activated and notification email processed.",
    userDeniedEmailProcessed: "User denied and notification email processed.",
    userSuspendedEmailProcessed: "User suspended and notification email processed.",
    confirmDenyTitle: "Deny this user?",
    confirmDenyBody: "This account request will be denied. The user will not be able to log in.",
    cancel: "Cancel",
    confirmDeny: "Yes, deny user",
    rejectionReason: "Rejection reason",
    viewPendingAccounts: "Manage account requests, approvals, and access status.",
    passwordHelp: "Use at least 8 characters.",
    loginRequired: "Please log in or continue as guest to access scenarios.",
    heroTitle: "Build confidence for everyday situations",
    heroSubtitle: "Practice everyday situations step by step.",
    stepFoundation: "Step 2 authentication foundation",
    footerStatus: "Login or guest mode required to access scenarios",
    scenarioCatalogueTitle: "Scenario Catalogue",
    scenarioCatalogueSubtitle: "Choose one everyday situation to open its placeholder page.",
    loadingScenarios: "Loading scenarios...",
    backendError: "We could not reach the ASSIST-AI backend. Please start the backend and refresh this page.",
    openScenario: "Open scenario",
    available: "Available",
    comingSoon: "Coming soon",
    scenarioNotFound: "Scenario not found",
    scenarioNotFoundBody: "The scenario you requested is not available.",
    scenarioNextStep: "This scenario will be implemented in the next steps.",
    backToScenarios: "Back to scenarios",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Language",
  },
  es: {
    login: "Iniciar sesion",
    createAccount: "Crear cuenta",
    continueAsGuest: "Continuar como invitado",
    viewScenarios: "Ver escenarios",
    scenarios: "Escenarios",
    profile: "Perfil",
    role: "Rol",
    logout: "Cerrar sesion",
    fullName: "Nombre completo",
    email: "Correo electronico",
    password: "Contrasena",
    confirmPassword: "Confirmar contrasena",
    passwordMismatch: "Las contrasenas no coinciden.",
    showPassword: "Mostrar contrasena",
    hidePassword: "Ocultar contrasena",
    preferredLanguage: "Idioma preferido",
    userCategory: "Categoria de usuario",
    personalUser: "Usuario personal",
    familyCaregiver: "Familia / cuidador",
    institution: "Institucion / organizacion",
    professional: "Profesional / educador",
    registerTitle: "Crea tu cuenta",
    registerSubtitle: "Elige tu categoria para que ASSIST-AI prepare la experiencia adecuada despues.",
    loginTitle: "Bienvenido de nuevo",
    loginSubtitle: "Inicia sesion para continuar al catalogo de escenarios.",
    guestTitle: "Continuar como invitado",
    guestQuestion: "Quieres guardar tu progreso durante esta sesion?",
    saveProgress: "Continuar y guardar progreso",
    continueWithoutSaving: "Continuar sin guardar",
    profileTitle: "Perfil",
    guestMode: "Modo invitado",
    saveProgressLabel: "Guardar progreso",
    yes: "Si",
    no: "No",
    authFormError: "Revisa tu informacion e intentalo de nuevo.",
    accountRequestSent: "Tu solicitud de cuenta fue enviada para aprobacion del administrador. Recibiras una notificacion despues de la revision.",
    pendingApprovalMessage: "Tu cuenta esta esperando aprobacion del administrador.",
    deniedAccountMessage: "Tu solicitud de cuenta no fue aprobada.",
    suspendedAccountMessage: "Tu cuenta esta suspendida.",
    accessDenied: "Acceso denegado.",
    adminUsers: "Panel de admin",
    approvalStatus: "Estado de aprobacion",
    createdDate: "Fecha de creacion",
    pending: "Pendiente",
    approved: "Aprobado",
    denied: "Denegado",
    suspended: "Suspendido",
    all: "Todos",
    approve: "Aprobar",
    activate: "Activar",
    deny: "Denegar",
    suspend: "Suspender",
    userApprovedEmailProcessed: "Usuario aprobado y correo de notificacion procesado.",
    userActivatedEmailProcessed: "Usuario activado y correo de notificacion procesado.",
    userDeniedEmailProcessed: "Usuario denegado y correo de notificacion procesado.",
    userSuspendedEmailProcessed: "Usuario suspendido y correo de notificacion procesado.",
    confirmDenyTitle: "Denegar este usuario?",
    confirmDenyBody: "Esta solicitud de cuenta sera denegada. El usuario no podra iniciar sesion.",
    cancel: "Cancelar",
    confirmDeny: "Si, denegar usuario",
    rejectionReason: "Motivo de rechazo",
    viewPendingAccounts: "Gestiona solicitudes de cuenta, aprobaciones y estado de acceso.",
    passwordHelp: "Usa al menos 8 caracteres.",
    loginRequired: "Inicia sesion o continua como invitado para acceder a los escenarios.",
    heroTitle: "Desarrolla confianza para situaciones cotidianas",
    heroSubtitle: "Practica situaciones cotidianas paso a paso.",
    stepFoundation: "Base de autenticacion del paso 2",
    footerStatus: "Se requiere iniciar sesion o modo invitado para acceder a los escenarios",
    scenarioCatalogueTitle: "Catalogo de escenarios",
    scenarioCatalogueSubtitle: "Elige una situacion cotidiana para abrir su pagina provisional.",
    loadingScenarios: "Cargando escenarios...",
    backendError: "No pudimos conectar con el backend de ASSIST-AI. Inicia el backend y actualiza esta pagina.",
    openScenario: "Abrir escenario",
    available: "Disponible",
    comingSoon: "Próximamente",
    scenarioNotFound: "Escenario no encontrado",
    scenarioNotFoundBody: "El escenario solicitado no esta disponible.",
    scenarioNextStep: "Este escenario se implementara en los proximos pasos.",
    backToScenarios: "Volver a escenarios",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Idioma",
  },
  de: {
    login: "Anmelden",
    createAccount: "Konto erstellen",
    continueAsGuest: "Als Gast fortfahren",
    viewScenarios: "Szenarien ansehen",
    scenarios: "Szenarien",
    profile: "Profil",
    role: "Rolle",
    logout: "Abmelden",
    fullName: "Vollstandiger Name",
    email: "E-Mail",
    password: "Passwort",
    confirmPassword: "Passwort bestatigen",
    passwordMismatch: "Die Passworter stimmen nicht uberein.",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort verbergen",
    preferredLanguage: "Bevorzugte Sprache",
    userCategory: "Nutzerkategorie",
    personalUser: "Privatperson",
    familyCaregiver: "Familie / Betreuungsperson",
    institution: "Institution / Organisation",
    professional: "Fachkraft / Lehrkraft",
    registerTitle: "Konto erstellen",
    registerSubtitle: "Wahle deine Nutzerkategorie, damit ASSIST-AI spater die passende Erfahrung vorbereiten kann.",
    loginTitle: "Willkommen zuruck",
    loginSubtitle: "Melde dich an, um zum Szenario-Katalog zu gelangen.",
    guestTitle: "Als Gast fortfahren",
    guestQuestion: "Mochtest du deinen Fortschritt wahrend dieser Sitzung speichern?",
    saveProgress: "Fortfahren und Fortschritt speichern",
    continueWithoutSaving: "Ohne Speichern fortfahren",
    profileTitle: "Profil",
    guestMode: "Gastmodus",
    saveProgressLabel: "Fortschritt speichern",
    yes: "Ja",
    no: "Nein",
    authFormError: "Bitte prufe deine Angaben und versuche es erneut.",
    accountRequestSent: "Deine Kontoanfrage wurde zur Admin-Freigabe gesendet. Du erhaltst nach der Prufung eine Benachrichtigung.",
    pendingApprovalMessage: "Dein Konto wartet auf Admin-Freigabe.",
    deniedAccountMessage: "Deine Kontoanfrage wurde nicht genehmigt.",
    suspendedAccountMessage: "Dein Konto ist gesperrt.",
    accessDenied: "Zugriff verweigert.",
    adminUsers: "Admin-Dashboard",
    approvalStatus: "Freigabestatus",
    createdDate: "Erstellt am",
    pending: "Ausstehend",
    approved: "Genehmigt",
    denied: "Abgelehnt",
    suspended: "Gesperrt",
    all: "Alle",
    approve: "Genehmigen",
    activate: "Aktivieren",
    deny: "Ablehnen",
    suspend: "Sperren",
    userApprovedEmailProcessed: "Benutzer genehmigt und Benachrichtigungs-E-Mail verarbeitet.",
    userActivatedEmailProcessed: "Benutzer aktiviert und Benachrichtigungs-E-Mail verarbeitet.",
    userDeniedEmailProcessed: "Benutzer abgelehnt und Benachrichtigungs-E-Mail verarbeitet.",
    userSuspendedEmailProcessed: "Benutzer gesperrt und Benachrichtigungs-E-Mail verarbeitet.",
    confirmDenyTitle: "Diesen Benutzer ablehnen?",
    confirmDenyBody: "Diese Kontoanfrage wird abgelehnt. Der Benutzer kann sich nicht anmelden.",
    cancel: "Abbrechen",
    confirmDeny: "Ja, Benutzer ablehnen",
    rejectionReason: "Ablehnungsgrund",
    viewPendingAccounts: "Verwalte Kontoanfragen, Freigaben und Zugriffsstatus.",
    passwordHelp: "Verwende mindestens 8 Zeichen.",
    loginRequired: "Bitte melde dich an oder fahre als Gast fort, um Szenarien zu offnen.",
    heroTitle: "Mehr Sicherheit in Alltagssituationen aufbauen",
    heroSubtitle: "Ube Alltagssituationen Schritt fur Schritt.",
    stepFoundation: "Authentifizierungsgrundlage fur Schritt 2",
    footerStatus: "Anmeldung oder Gastmodus erforderlich, um Szenarien zu offnen",
    scenarioCatalogueTitle: "Szenario-Katalog",
    scenarioCatalogueSubtitle: "Wahle eine Alltagssituation, um die Platzhalterseite zu offnen.",
    loadingScenarios: "Szenarien werden geladen...",
    backendError: "Das ASSIST-AI-Backend konnte nicht erreicht werden. Bitte starte das Backend und lade diese Seite neu.",
    openScenario: "Szenario offnen",
    available: "Verfügbar",
    comingSoon: "Demnächst verfügbar",
    scenarioNotFound: "Szenario nicht gefunden",
    scenarioNotFoundBody: "Das angeforderte Szenario ist nicht verfugbar.",
    scenarioNextStep: "Dieses Szenario wird in den nachsten Schritten umgesetzt.",
    backToScenarios: "Zuruck zu den Szenarien",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Sprache",
  },
  tr: {
    login: "Giris yap",
    createAccount: "Hesap olustur",
    continueAsGuest: "Misafir olarak devam et",
    viewScenarios: "Senaryolari gor",
    scenarios: "Senaryolar",
    profile: "Profil",
    role: "Rol",
    logout: "Cikis yap",
    fullName: "Ad soyad",
    email: "E-posta",
    password: "Sifre",
    confirmPassword: "Sifreyi onayla",
    passwordMismatch: "Sifreler eslesmiyor.",
    showPassword: "Sifreyi goster",
    hidePassword: "Sifreyi gizle",
    preferredLanguage: "Tercih edilen dil",
    userCategory: "Kullanici kategorisi",
    personalUser: "Kisisel kullanici",
    familyCaregiver: "Aile / bakim veren",
    institution: "Kurum / organizasyon",
    professional: "Profesyonel / egitimci",
    registerTitle: "Hesabini olustur",
    registerSubtitle: "ASSIST-AI'nin daha sonra uygun deneyimi hazirlamasi icin kategorini sec.",
    loginTitle: "Tekrar hos geldin",
    loginSubtitle: "Senaryo kataloguna devam etmek icin giris yap.",
    guestTitle: "Misafir olarak devam et",
    guestQuestion: "Bu oturumda ilerlemeni kaydetmek ister misin?",
    saveProgress: "Devam et ve ilerlemeyi kaydet",
    continueWithoutSaving: "Kaydetmeden devam et",
    profileTitle: "Profil",
    guestMode: "Misafir modu",
    saveProgressLabel: "Ilerlemeyi kaydet",
    yes: "Evet",
    no: "Hayir",
    authFormError: "Lutfen bilgilerini kontrol edip tekrar dene.",
    accountRequestSent: "Hesap istegin admin onayina gonderildi. Incelemeden sonra bildirim alacaksin.",
    pendingApprovalMessage: "Hesabin admin onayi bekliyor.",
    deniedAccountMessage: "Hesap istegin onaylanmadi.",
    suspendedAccountMessage: "Hesabin askida.",
    accessDenied: "Erisim reddedildi.",
    adminUsers: "Admin Paneli",
    approvalStatus: "Onay durumu",
    createdDate: "Olusturma tarihi",
    pending: "Beklemede",
    approved: "Onaylandi",
    denied: "Reddedildi",
    suspended: "Askida",
    all: "Tumu",
    approve: "Onayla",
    activate: "Etkinlestir",
    deny: "Reddet",
    suspend: "Askiya al",
    userApprovedEmailProcessed: "Kullanici onaylandi ve bildirim e-postasi islendi.",
    userActivatedEmailProcessed: "Kullanici etkinlestirildi ve bildirim e-postasi islendi.",
    userDeniedEmailProcessed: "Kullanici reddedildi ve bildirim e-postasi islendi.",
    userSuspendedEmailProcessed: "Kullanici askiya alindi ve bildirim e-postasi islendi.",
    confirmDenyTitle: "Bu kullanici reddedilsin mi?",
    confirmDenyBody: "Bu hesap istegi reddedilecek. Kullanici giris yapamayacak.",
    cancel: "Iptal",
    confirmDeny: "Evet, kullaniciyi reddet",
    rejectionReason: "Red nedeni",
    viewPendingAccounts: "Hesap isteklerini, onaylari ve erisim durumunu yonet.",
    passwordHelp: "En az 8 karakter kullan.",
    loginRequired: "Senaryolara erismek icin giris yap veya misafir olarak devam et.",
    heroTitle: "Gunluk durumlar icin ozguven kazan",
    heroSubtitle: "Gunluk durumlari adim adim pratik yap.",
    stepFoundation: "2. adim kimlik dogrulama temeli",
    footerStatus: "Senaryolara erismek icin giris veya misafir modu gerekir",
    scenarioCatalogueTitle: "Senaryo Katalogu",
    scenarioCatalogueSubtitle: "Yer tutucu sayfasini acmak icin bir gunluk durum sec.",
    loadingScenarios: "Senaryolar yukleniyor...",
    backendError: "ASSIST-AI backendine ulasilamadi. Lutfen backend'i baslatip sayfayi yenile.",
    openScenario: "Senaryoyu ac",
    available: "Kullanılabilir",
    comingSoon: "Yakında",
    scenarioNotFound: "Senaryo bulunamadi",
    scenarioNotFoundBody: "Istedigin senaryo kullanilamiyor.",
    scenarioNextStep: "Bu senaryo sonraki adimlarda uygulanacak.",
    backToScenarios: "Senaryolara don",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Dil",
  },
  pt: {
    login: "Entrar",
    createAccount: "Criar conta",
    continueAsGuest: "Continuar como convidado",
    viewScenarios: "Ver cenarios",
    scenarios: "Cenarios",
    profile: "Perfil",
    role: "Funcao",
    logout: "Sair",
    fullName: "Nome completo",
    email: "E-mail",
    password: "Senha",
    confirmPassword: "Confirmar senha",
    passwordMismatch: "As senhas nao correspondem.",
    showPassword: "Mostrar senha",
    hidePassword: "Ocultar senha",
    preferredLanguage: "Idioma preferido",
    userCategory: "Categoria de usuario",
    personalUser: "Usuario pessoal",
    familyCaregiver: "Familia / cuidador",
    institution: "Instituicao / organizacao",
    professional: "Profissional / educador",
    registerTitle: "Crie sua conta",
    registerSubtitle: "Escolha sua categoria para que o ASSIST-AI prepare a experiencia certa depois.",
    loginTitle: "Boas-vindas de volta",
    loginSubtitle: "Entre para continuar ao catalogo de cenarios.",
    guestTitle: "Continuar como convidado",
    guestQuestion: "Voce quer salvar seu progresso durante esta sessao?",
    saveProgress: "Continuar e salvar progresso",
    continueWithoutSaving: "Continuar sem salvar",
    profileTitle: "Perfil",
    guestMode: "Modo convidado",
    saveProgressLabel: "Salvar progresso",
    yes: "Sim",
    no: "Nao",
    authFormError: "Verifique suas informacoes e tente novamente.",
    accountRequestSent: "Sua solicitacao de conta foi enviada para aprovacao do admin. Voce recebera uma notificacao apos a revisao.",
    pendingApprovalMessage: "Sua conta esta aguardando aprovacao do admin.",
    deniedAccountMessage: "Sua solicitacao de conta nao foi aprovada.",
    suspendedAccountMessage: "Sua conta esta suspensa.",
    accessDenied: "Acesso negado.",
    adminUsers: "Painel admin",
    approvalStatus: "Status de aprovacao",
    createdDate: "Data de criacao",
    pending: "Pendente",
    approved: "Aprovado",
    denied: "Negado",
    suspended: "Suspenso",
    all: "Todos",
    approve: "Aprovar",
    activate: "Ativar",
    deny: "Negar",
    suspend: "Suspender",
    userApprovedEmailProcessed: "Usuario aprovado e email de notificacao processado.",
    userActivatedEmailProcessed: "Usuario ativado e email de notificacao processado.",
    userDeniedEmailProcessed: "Usuario negado e email de notificacao processado.",
    userSuspendedEmailProcessed: "Usuario suspenso e email de notificacao processado.",
    confirmDenyTitle: "Negar este usuario?",
    confirmDenyBody: "Esta solicitacao de conta sera negada. O usuario nao podera entrar.",
    cancel: "Cancelar",
    confirmDeny: "Sim, negar usuario",
    rejectionReason: "Motivo da rejeicao",
    viewPendingAccounts: "Gerencie solicitacoes de conta, aprovacoes e status de acesso.",
    passwordHelp: "Use pelo menos 8 caracteres.",
    loginRequired: "Entre ou continue como convidado para acessar os cenarios.",
    heroTitle: "Crie confianca para situacoes do dia a dia",
    heroSubtitle: "Pratique situacoes do dia a dia passo a passo.",
    stepFoundation: "Base de autenticacao da etapa 2",
    footerStatus: "E necessario entrar ou usar modo convidado para acessar os cenarios",
    scenarioCatalogueTitle: "Catalogo de cenarios",
    scenarioCatalogueSubtitle: "Escolha uma situacao do dia a dia para abrir sua pagina provisoria.",
    loadingScenarios: "Carregando cenarios...",
    backendError: "Nao foi possivel acessar o backend do ASSIST-AI. Inicie o backend e atualize esta pagina.",
    openScenario: "Abrir cenario",
    available: "Disponível",
    comingSoon: "Em breve",
    scenarioNotFound: "Cenario nao encontrado",
    scenarioNotFoundBody: "O cenario solicitado nao esta disponivel.",
    scenarioNextStep: "Este cenario sera implementado nas proximas etapas.",
    backToScenarios: "Voltar aos cenarios",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Idioma",
  },
  fr: {
    login: "Connexion",
    createAccount: "Creer un compte",
    continueAsGuest: "Continuer comme invite",
    viewScenarios: "Voir les scenarios",
    scenarios: "Scenarios",
    profile: "Profil",
    role: "Role",
    logout: "Deconnexion",
    fullName: "Nom complet",
    email: "E-mail",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    preferredLanguage: "Langue preferee",
    userCategory: "Categorie d'utilisateur",
    personalUser: "Utilisateur personnel",
    familyCaregiver: "Famille / aidant",
    institution: "Institution / organisation",
    professional: "Professionnel / educateur",
    registerTitle: "Cree ton compte",
    registerSubtitle: "Choisis ta categorie pour qu'ASSIST-AI prepare plus tard l'experience adaptee.",
    loginTitle: "Bon retour",
    loginSubtitle: "Connecte-toi pour continuer vers le catalogue de scenarios.",
    guestTitle: "Continuer comme invite",
    guestQuestion: "Veux-tu enregistrer ta progression pendant cette session ?",
    saveProgress: "Continuer et enregistrer la progression",
    continueWithoutSaving: "Continuer sans enregistrer",
    profileTitle: "Profil",
    guestMode: "Mode invite",
    saveProgressLabel: "Enregistrer la progression",
    yes: "Oui",
    no: "Non",
    authFormError: "Verifie tes informations puis reessaie.",
    accountRequestSent: "Ta demande de compte a ete envoyee pour approbation admin. Tu recevras une notification apres examen.",
    pendingApprovalMessage: "Ton compte attend l'approbation admin.",
    deniedAccountMessage: "Ta demande de compte n'a pas ete approuvee.",
    suspendedAccountMessage: "Ton compte est suspendu.",
    accessDenied: "Acces refuse.",
    adminUsers: "Tableau admin",
    approvalStatus: "Statut d'approbation",
    createdDate: "Date de creation",
    pending: "En attente",
    approved: "Approuve",
    denied: "Refuse",
    suspended: "Suspendu",
    all: "Tous",
    approve: "Approuver",
    activate: "Activer",
    deny: "Refuser",
    suspend: "Suspendre",
    userApprovedEmailProcessed: "Utilisateur approuve et e-mail de notification traite.",
    userActivatedEmailProcessed: "Utilisateur active et e-mail de notification traite.",
    userDeniedEmailProcessed: "Utilisateur refuse et e-mail de notification traite.",
    userSuspendedEmailProcessed: "Utilisateur suspendu et e-mail de notification traite.",
    confirmDenyTitle: "Refuser cet utilisateur ?",
    confirmDenyBody: "Cette demande de compte sera refusee. L'utilisateur ne pourra pas se connecter.",
    cancel: "Annuler",
    confirmDeny: "Oui, refuser l'utilisateur",
    rejectionReason: "Raison du refus",
    viewPendingAccounts: "Gere les demandes de compte, les approbations et le statut d'acces.",
    passwordHelp: "Utilise au moins 8 caracteres.",
    loginRequired: "Connecte-toi ou continue comme invite pour acceder aux scenarios.",
    heroTitle: "Gagner en confiance dans les situations du quotidien",
    heroSubtitle: "Entraine-toi aux situations du quotidien etape par etape.",
    stepFoundation: "Fondation d'authentification de l'etape 2",
    footerStatus: "Connexion ou mode invite requis pour acceder aux scenarios",
    scenarioCatalogueTitle: "Catalogue de scenarios",
    scenarioCatalogueSubtitle: "Choisis une situation du quotidien pour ouvrir sa page provisoire.",
    loadingScenarios: "Chargement des scenarios...",
    backendError: "Impossible de joindre le backend ASSIST-AI. Lance le backend puis actualise cette page.",
    openScenario: "Ouvrir le scenario",
    available: "Disponible",
    comingSoon: "Bientôt disponible",
    scenarioNotFound: "Scenario introuvable",
    scenarioNotFoundBody: "Le scenario demande n'est pas disponible.",
    scenarioNextStep: "Ce scenario sera implemente dans les prochaines etapes.",
    backToScenarios: "Retour aux scenarios",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Langue",
  },
};

const scenarioTranslations: Record<LanguageCode, Record<string, ScenarioText>> = {
  en: {},
  es: {
    shopping: { title: "Compras", description: "Pide ayuda a un dependiente para encontrar un producto." },
    "cinema-theatre-tickets": { title: "Entradas de cine / teatro", description: "Solicita un cambio de asiento porque el asiento asignado tiene un problema." },
    "restaurant-ordering": { title: "Pedir en un restaurante", description: "Pide una comida y elige una alternativa cuando el plato solicitado no esta disponible." },
    "public-transport": { title: "Usar transporte publico", description: "Identifica el transporte correcto, valida un billete y pide indicaciones si es necesario." },
    "atm-withdrawal": { title: "Retirar dinero de un cajero automatico", description: "Retira una cantidad fija y responde con calma a una situacion de error simple." },
    "time-off-overwhelmed": { title: "Pedir tiempo libre cuando te sientes abrumado", description: "Practica como pedir a un jefe un descanso breve o un dia libre cuando te sientes abrumado." },
    "online-bill-payment": { title: "Pagar una factura en linea", description: "Inicia sesion, selecciona una factura, completa el pago y confirma el exito." },
    "weekly-spending-plan": { title: "Crear un plan semanal de gastos", description: "Crea un presupuesto semanal y divide los gastos en categorias simples." },
    "consoling-a-friend": { title: "Consolar a un amigo", description: "Escucha a un amigo que comparte algo triste y responde de forma adecuada." },
    "managing-delay-calmly": { title: "Gestionar una demora con calma", description: "Responde con calma ante una cita o servicio retrasado." },
    "conflict-perspective-taking": { title: "Conflicto y toma de perspectiva", description: "Comprende una critica o desacuerdo y elige una respuesta tranquila." },
    "short-team-discussion": { title: "Participar en una breve reunion de equipo", description: "Escucha, espera tu turno, expresa una opinion y responde de forma adecuada." },
  },
  de: {
    shopping: { title: "Einkaufen", description: "Bitte eine Verkaufskraft um Hilfe, ein Produkt zu finden." },
    "cinema-theatre-tickets": { title: "Kino- / Theaterkarten", description: "Bitte um einen Sitzplatzwechsel, weil der zugewiesene Sitz ein Problem hat." },
    "restaurant-ordering": { title: "Im Restaurant bestellen", description: "Bestelle ein Essen und wahle eine Alternative, wenn das gewunschte Gericht nicht verfugbar ist." },
    "public-transport": { title: "Offentliche Verkehrsmittel nutzen", description: "Finde das richtige Verkehrsmittel, entwerte ein Ticket und frage bei Bedarf nach dem Weg." },
    "atm-withdrawal": { title: "Geld am Geldautomaten abheben", description: "Hebe einen festen Betrag ab und reagiere ruhig auf eine einfache Fehlersituation." },
    "time-off-overwhelmed": { title: "Um freie Zeit bitten, wenn du uberfordert bist", description: "Ube, wie du deinen Vorgesetzten um eine kurze Pause oder einen freien Tag bittest." },
    "online-bill-payment": { title: "Eine Rechnung online bezahlen", description: "Melde dich an, wahle eine Rechnung aus, schliesse die Zahlung ab und bestatige den Erfolg." },
    "weekly-spending-plan": { title: "Einen wochentlichen Ausgabenplan erstellen", description: "Erstelle ein Wochenbudget und teile Ausgaben in einfache Kategorien ein." },
    "consoling-a-friend": { title: "Einen Freund trosten", description: "Hore einem Freund zu, der etwas Trauriges erzahlt, und antworte angemessen." },
    "managing-delay-calmly": { title: "Ruhig mit einer Verzogerung umgehen", description: "Reagiere ruhig auf einen verspateten Termin oder Service." },
    "conflict-perspective-taking": { title: "Konflikt und Perspektivwechsel", description: "Verstehe Kritik oder Meinungsverschiedenheiten und wahle eine ruhige Antwort." },
    "short-team-discussion": { title: "An einer kurzen Teambesprechung teilnehmen", description: "Hore zu, warte, bis du an der Reihe bist, aussere eine Meinung und antworte angemessen." },
  },
  tr: {
    shopping: { title: "Alisveris", description: "Bir urunu bulmak icin magaza gorevlisinden yardim iste." },
    "cinema-theatre-tickets": { title: "Sinema / Tiyatro Biletleri", description: "Atanan koltukta sorun oldugu icin koltuk degisikligi iste." },
    "restaurant-ordering": { title: "Restoranda Siparis Verme", description: "Yemek siparisi ver ve istedigin yemek yoksa bir alternatif sec." },
    "public-transport": { title: "Toplu Tasima Kullanma", description: "Dogru ulasimi belirle, bileti dogrula ve gerekirse yol tarifi iste." },
    "atm-withdrawal": { title: "ATM'den Para Cekme", description: "Belirli bir miktar para cek ve basit bir hata durumuna sakin yanit ver." },
    "time-off-overwhelmed": { title: "Bunalmisken Izin Isteme", description: "Bunalmis hissettiginde yoneticinden kisa bir mola veya bir gun izin istemeyi pratik yap." },
    "online-bill-payment": { title: "Cevrim Ici Fatura Odeme", description: "Giris yap, faturayi sec, odemeyi tamamla ve basarili oldugunu dogrula." },
    "weekly-spending-plan": { title: "Haftalik Harcama Plani Olusturma", description: "Haftalik butce olustur ve giderleri basit kategorilere ayir." },
    "consoling-a-friend": { title: "Bir Arkadasi Teselli Etme", description: "Uzgun bir sey paylasan arkadasini dinle ve uygun sekilde yanit ver." },
    "managing-delay-calmly": { title: "Gecikmeyi Sakin Yonetme", description: "Geciken bir randevuya veya hizmete sakin sekilde yanit ver." },
    "conflict-perspective-taking": { title: "Catisma ve Bakis Acisi Alma", description: "Elestiriyi veya anlasmazligi anla ve sakin bir yanit sec." },
    "short-team-discussion": { title: "Iste Kisa Bir Takim Tartismasina Katilma", description: "Dinle, sirani bekle, bir gorus ifade et ve uygun sekilde yanit ver." },
  },
  pt: {
    shopping: { title: "Compras", description: "Peca ajuda a um atendente para encontrar um produto." },
    "cinema-theatre-tickets": { title: "Ingressos de cinema / teatro", description: "Peca uma troca de assento porque o assento designado tem um problema." },
    "restaurant-ordering": { title: "Pedido em restaurante", description: "Peca uma refeicao e escolha uma alternativa quando o prato desejado nao estiver disponivel." },
    "public-transport": { title: "Usar transporte publico", description: "Identifique o transporte correto, valide um bilhete e peca direcoes se necessario." },
    "atm-withdrawal": { title: "Sacar dinheiro em um caixa eletronico", description: "Saque um valor fixo e responda com calma a uma situacao simples de erro." },
    "time-off-overwhelmed": { title: "Pedir folga quando estiver sobrecarregado", description: "Pratique como pedir ao chefe uma pausa curta ou um dia de folga quando estiver sobrecarregado." },
    "online-bill-payment": { title: "Pagar uma conta online", description: "Entre, selecione uma conta, conclua o pagamento e confirme o sucesso." },
    "weekly-spending-plan": { title: "Criar um plano semanal de gastos", description: "Crie um orcamento semanal e divida as despesas em categorias simples." },
    "consoling-a-friend": { title: "Consolar um amigo", description: "Ouça um amigo que compartilha algo triste e responda de forma adequada." },
    "managing-delay-calmly": { title: "Lidar com um atraso com calma", description: "Responda com calma a uma consulta ou servico atrasado." },
    "conflict-perspective-taking": { title: "Conflito e tomada de perspectiva", description: "Entenda uma critica ou discordancia e escolha uma resposta calma." },
    "short-team-discussion": { title: "Participar de uma breve discussao em equipe", description: "Ouça, espere sua vez, expresse uma opiniao e responda de forma adequada." },
  },
  fr: {
    shopping: { title: "Faire des achats", description: "Demande de l'aide a un vendeur pour trouver un produit." },
    "cinema-theatre-tickets": { title: "Billets de cinema / theatre", description: "Demande a changer de siege parce que le siege attribue a un probleme." },
    "restaurant-ordering": { title: "Commander au restaurant", description: "Commande un repas et choisis une alternative si le plat demande n'est pas disponible." },
    "public-transport": { title: "Prendre les transports en commun", description: "Identifie le bon transport, valide un ticket et demande ton chemin si necessaire." },
    "atm-withdrawal": { title: "Retirer de l'argent a un distributeur", description: "Retire un montant fixe et reponds calmement a une situation d'erreur simple." },
    "time-off-overwhelmed": { title: "Demander du temps libre quand on se sent depasse", description: "Entraine-toi a demander a un responsable une courte pause ou un jour de repos." },
    "online-bill-payment": { title: "Payer une facture en ligne", description: "Connecte-toi, selectionne une facture, effectue le paiement et confirme la reussite." },
    "weekly-spending-plan": { title: "Creer un plan de depenses hebdomadaire", description: "Cree un budget hebdomadaire et repartis les depenses en categories simples." },
    "consoling-a-friend": { title: "Consoler un ami", description: "Ecoute un ami qui partage quelque chose de triste et reponds de facon appropriee." },
    "managing-delay-calmly": { title: "Gerer calmement un retard", description: "Reponds calmement a un rendez-vous ou un service retarde." },
    "conflict-perspective-taking": { title: "Conflit et prise de perspective", description: "Comprends une critique ou un desaccord et choisis une reponse calme." },
    "short-team-discussion": { title: "Participer a une courte discussion d'equipe", description: "Ecoute, attends ton tour, exprime une opinion et reponds de facon appropriee." },
  },
};

const TranslationContext = createContext<TranslationContextValue | null>(null);
const LANGUAGE_STORAGE_KEY = "assist_ai_language";

function isLanguageCode(value: string | null): value is LanguageCode {
  return languages.some((language) => language.code === value);
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageCode(storedLanguage) ? storedLanguage : "en";
  });

  const setLanguage = (nextLanguage: LanguageCode) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  };

  const value = useMemo<TranslationContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => uiTranslations[language][key],
      translateScenario: (scenario) => ({
        ...scenario,
        ...(scenarioTranslations[language][scenario.slug] ?? {}),
      }),
    }),
    [language],
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error("useTranslation must be used inside TranslationProvider");
  }

  return context;
}
