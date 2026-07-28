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
    login: "Iniciar sesión",
    createAccount: "Crear cuenta",
    continueAsGuest: "Continuar como invitado",
    viewScenarios: "Ver escenarios",
    scenarios: "Escenarios",
    profile: "Perfil",
    role: "Rol",
    logout: "Cerrar sesión",
    fullName: "Nombre completo",
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    passwordMismatch: "Las contraseñas no coinciden.",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    preferredLanguage: "Idioma preferido",
    userCategory: "Categoría de usuario",
    personalUser: "Usuario personal",
    familyCaregiver: "Familia / cuidador",
    institution: "Institución / organización",
    professional: "Profesional / educador",
    registerTitle: "Crea tu cuenta",
    registerSubtitle: "Elige tu categoría para que ASSIST-AI prepare la experiencia adecuada después.",
    loginTitle: "Bienvenido de nuevo",
    loginSubtitle: "Inicia sesión para continuar al catálogo de escenarios.",
    guestTitle: "Continuar como invitado",
    guestQuestion: "Quieres guardar tu progreso durante esta sesión?",
    saveProgress: "Continuar y guardar progreso",
    continueWithoutSaving: "Continuar sin guardar",
    profileTitle: "Perfil",
    guestMode: "Modo invitado",
    saveProgressLabel: "Guardar progreso",
    yes: "Si",
    no: "No",
    authFormError: "Revisa tu información e inténtalo de nuevo.",
    accountRequestSent: "Tu solicitud de cuenta fue enviada para aprobación del administrador. Recibirás una notificación después de la revisión.",
    pendingApprovalMessage: "Tu cuenta esta esperando aprobación del administrador.",
    deniedAccountMessage: "Tu solicitud de cuenta no fue aprobada.",
    suspendedAccountMessage: "Tu cuenta esta suspendida.",
    accessDenied: "Acceso denegado.",
    adminUsers: "Panel de admin",
    approvalStatus: "Estado de aprobación",
    createdDate: "Fecha de creación",
    pending: "Pendiente",
    approved: "Aprobado",
    denied: "Denegado",
    suspended: "Suspendido",
    all: "Todos",
    approve: "Aprobar",
    activate: "Activar",
    deny: "Denegar",
    suspend: "Suspender",
    userApprovedEmailProcessed: "Usuario aprobado y correo de notificación procesado.",
    userActivatedEmailProcessed: "Usuario activado y correo de notificación procesado.",
    userDeniedEmailProcessed: "Usuario denegado y correo de notificación procesado.",
    userSuspendedEmailProcessed: "Usuario suspendido y correo de notificación procesado.",
    confirmDenyTitle: "Denegar este usuario?",
    confirmDenyBody: "Esta solicitud de cuenta será denegada. El usuario no podrá iniciar sesión.",
    cancel: "Cancelar",
    confirmDeny: "Sí, denegar usuario",
    rejectionReason: "Motivo de rechazo",
    viewPendingAccounts: "Gestiona solicitudes de cuenta, aprobaciónes y estado de acceso.",
    passwordHelp: "Usa al menos 8 caracteres.",
    loginRequired: "Inicia sesión o continúa como invitado para acceder a los escenarios.",
    heroTitle: "Desarrolla confianza para situaciónes cotidianas",
    heroSubtitle: "Practica situaciónes cotidianas paso a paso.",
    stepFoundation: "Base de autenticación del paso 2",
    footerStatus: "Se requiere iniciar sesión o modo invitado para acceder a los escenarios",
    scenarioCatalogueTitle: "Catálogo de escenarios",
    scenarioCatalogueSubtitle: "Elige una situación cotidiana para abrir su página provisional.",
    loadingScenarios: "Cargando escenarios...",
    backendError: "No pudimos conectar con el backend de ASSIST-AI. Inicia el backend y actualiza esta página.",
    openScenario: "Abrir escenario",
    available: "Disponible",
    comingSoon: "Próximamente",
    scenarioNotFound: "Escenario no encontrado",
    scenarioNotFoundBody: "El escenario solicitado no está disponible.",
    scenarioNextStep: "Este escenario se implementará en los próximos pasos.",
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
    fullName: "Vollständiger Name",
    email: "E-Mail",
    password: "Passwort",
    confirmPassword: "Passwort bestätigen",
    passwordMismatch: "Die Passwörter stimmen nicht überein.",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort verbergen",
    preferredLanguage: "Bevorzugte Sprache",
    userCategory: "Nutzerkategorie",
    personalUser: "Privatperson",
    familyCaregiver: "Familie / Betreuungsperson",
    institution: "Institution / Organisation",
    professional: "Fachkraft / Lehrkraft",
    registerTitle: "Konto erstellen",
    registerSubtitle: "Wähle deine Nutzerkategorie, damit ASSIST-AI später die passende Erfahrung vorbereiten kann.",
    loginTitle: "Willkommen zurück",
    loginSubtitle: "Melde dich an, um zum Szenario-Katalog zu gelangen.",
    guestTitle: "Als Gast fortfahren",
    guestQuestion: "Möchtest du deinen Fortschritt während dieser Sitzung speichern?",
    saveProgress: "Fortfahren und Fortschritt speichern",
    continueWithoutSaving: "Ohne Speichern fortfahren",
    profileTitle: "Profil",
    guestMode: "Gastmodus",
    saveProgressLabel: "Fortschritt speichern",
    yes: "Ja",
    no: "Nein",
    authFormError: "Bitte prüfe deine Angaben und versuche es erneut.",
    accountRequestSent: "Deine Kontoanfrage wurde zur Admin-Freigabe gesendet. Du erhältst nach der Prüfung eine Benachrichtigung.",
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
    loginRequired: "Bitte melde dich an oder fahre als Gast fort, um Szenarien zu öffnen.",
    heroTitle: "Mehr Sicherheit in Alltagssituationen aufbauen",
    heroSubtitle: "Übe Alltagssituationen Schritt für Schritt.",
    stepFoundation: "Authentifizierungsgrundlage für Schritt 2",
    footerStatus: "Anmeldung oder Gastmodus erforderlich, um Szenarien zu öffnen",
    scenarioCatalogueTitle: "Szenario-Katalog",
    scenarioCatalogueSubtitle: "Wähle eine Alltagssituation, um die Platzhalterseite zu öffnen.",
    loadingScenarios: "Szenarien werden geladen...",
    backendError: "Das ASSIST-AI-Backend konnte nicht erreicht werden. Bitte starte das Backend und lade diese Seite neu.",
    openScenario: "Szenario öffnen",
    available: "Verfügbar",
    comingSoon: "Demnächst verfügbar",
    scenarioNotFound: "Szenario nicht gefunden",
    scenarioNotFoundBody: "Das angeforderte Szenario ist nicht verfügbar.",
    scenarioNextStep: "Dieses Szenario wird in den nächsten Schritten umgesetzt.",
    backToScenarios: "Zurück zu den Szenarien",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Sprache",
  },
  tr: {
    login: "Giriş yap",
    createAccount: "Hesap oluştur",
    continueAsGuest: "Misafir olarak devam et",
    viewScenarios: "Senaryoları gör",
    scenarios: "Senaryolar",
    profile: "Profil",
    role: "Rol",
    logout: "Çıkış yap",
    fullName: "Ad soyad",
    email: "E-posta",
    password: "Şifre",
    confirmPassword: "Şifreyi onayla",
    passwordMismatch: "Şifreler eşleşmiyor.",
    showPassword: "Şifreyi göster",
    hidePassword: "Şifreyi gizle",
    preferredLanguage: "Tercih edilen dil",
    userCategory: "Kullanıcı kategorisi",
    personalUser: "Kişisel kullanıcı",
    familyCaregiver: "Aile / bakım veren",
    institution: "Kurum / organizasyon",
    professional: "Profesyonel / eğitimci",
    registerTitle: "Hesabını oluştur",
    registerSubtitle: "ASSIST-AI'nin daha sonra uygün deneyimi hazırlaması için kategorini seç.",
    loginTitle: "Tekrar hoş geldin",
    loginSubtitle: "Senaryo katalogüna devam etmek için giriş yap.",
    guestTitle: "Misafir olarak devam et",
    guestQuestion: "Bu oturumda ilerlemeni kaydetmek ister misin?",
    saveProgress: "Devam et ve ilerlemeyi kaydet",
    continueWithoutSaving: "Kaydetmeden devam et",
    profileTitle: "Profil",
    guestMode: "Misafir modu",
    saveProgressLabel: "İlerlemeyi kaydet",
    yes: "Evet",
    no: "Hayır",
    authFormError: "Lütfen bilgilerini kontrol edip tekrar dene.",
    accountRequestSent: "Hesap istegin admin onayına gönderildi. İncelemeden sonra bildirim alacaksin.",
    pendingApprovalMessage: "Hesabın admin onayı bekliyor.",
    deniedAccountMessage: "Hesap istegin onaylanmadı.",
    suspendedAccountMessage: "Hesabın askıda.",
    accessDenied: "Erişim reddedildi.",
    adminUsers: "Admin Paneli",
    approvalStatus: "Onay durumu",
    createdDate: "Oluşturma tarihi",
    pending: "Beklemede",
    approved: "Onaylandı",
    denied: "Reddedildi",
    suspended: "Askida",
    all: "Tümü",
    approve: "Onayla",
    activate: "Etkinleştir",
    deny: "Reddet",
    suspend: "Askıya al",
    userApprovedEmailProcessed: "Kullanıcı onaylandi ve bildirim e-postasi islendi.",
    userActivatedEmailProcessed: "Kullanıcı etkinlestirildi ve bildirim e-postasi islendi.",
    userDeniedEmailProcessed: "Kullanıcı reddedildi ve bildirim e-postasi islendi.",
    userSuspendedEmailProcessed: "Kullanıcı askiya alindi ve bildirim e-postasi islendi.",
    confirmDenyTitle: "Bu kullanıcı reddedilsin mi?",
    confirmDenyBody: "Bu hesap istegi reddedileçek. Kullanıcı giriş yapamayacak.",
    cancel: "Iptal",
    confirmDeny: "Evet, kullanıcıyi reddet",
    rejectionReason: "Red nedeni",
    viewPendingAccounts: "Hesap isteklerini, onayları ve erişim durumunu yönet.",
    passwordHelp: "En az 8 karakter kullan.",
    loginRequired: "Senaryolara erismek için giriş yap veya misafir olarak devam et.",
    heroTitle: "Günlük durumlar için özgüven kazan",
    heroSubtitle: "Günlük durumlari adim adim pratik yap.",
    stepFoundation: "2. adim kimlik doğrulama temeli",
    footerStatus: "Senaryolara erismek için giriş veya misafir modu gerekir",
    scenarioCatalogueTitle: "Senaryo Kataloğu",
    scenarioCatalogueSubtitle: "Yer tutucu sayfasını açmak için bir günlük durum seç.",
    loadingScenarios: "Senaryolar yükleniyor...",
    backendError: "ASSIST-AI backendine ulaşılamadı. Lütfen backend'i başlatıp sayfayı yenile.",
    openScenario: "Senaryoyu aç",
    available: "Kullanılabilir",
    comingSoon: "Yakında",
    scenarioNotFound: "Senaryo bulunamadı",
    scenarioNotFoundBody: "İstediğin senaryo kullanılamıyor.",
    scenarioNextStep: "Bu senaryo sonraki adimlarda uygulanacak.",
    backToScenarios: "Senaryolara dön",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Dil",
  },
  pt: {
    login: "Entrar",
    createAccount: "Criar conta",
    continueAsGuest: "Continuar como convidado",
    viewScenarios: "Ver cenários",
    scenarios: "Cenários",
    profile: "Perfil",
    role: "Função",
    logout: "Sair",
    fullName: "Nome completo",
    email: "E-mail",
    password: "Senha",
    confirmPassword: "Confirmar senha",
    passwordMismatch: "As senhas não correspondem.",
    showPassword: "Mostrar senha",
    hidePassword: "Ocultar senha",
    preferredLanguage: "Idioma preferido",
    userCategory: "Categoria de usuário",
    personalUser: "Usuário pessoal",
    familyCaregiver: "Familia / cuidador",
    institution: "Instituição / organização",
    professional: "Profissional / educador",
    registerTitle: "Crie sua conta",
    registerSubtitle: "Escolha sua categoria para que o ASSIST-AI prepare a experiência certa depois.",
    loginTitle: "Boas-vindas de volta",
    loginSubtitle: "Entre para continuar ao catálogo de cenários.",
    guestTitle: "Continuar como convidado",
    guestQuestion: "Você quer salvar seu progresso durante está sessão?",
    saveProgress: "Continuar e salvar progresso",
    continueWithoutSaving: "Continuar sem salvar",
    profileTitle: "Perfil",
    guestMode: "Modo convidado",
    saveProgressLabel: "Salvar progresso",
    yes: "Sim",
    no: "Não",
    authFormError: "Verifique suas informações e tente novamente.",
    accountRequestSent: "Sua solicitação de conta foi enviada para aprovação do admin. Você recebera uma notificação após a revisao.",
    pendingApprovalMessage: "Sua conta está aguardando aprovação do admin.",
    deniedAccountMessage: "Sua solicitação de conta não foi aprovada.",
    suspendedAccountMessage: "Sua conta está suspensa.",
    accessDenied: "Acesso negado.",
    adminUsers: "Painel admin",
    approvalStatus: "Status de aprovação",
    createdDate: "Data de criação",
    pending: "Pendente",
    approved: "Aprovado",
    denied: "Negado",
    suspended: "Suspenso",
    all: "Todos",
    approve: "Aprovar",
    activate: "Ativar",
    deny: "Negar",
    suspend: "Suspender",
    userApprovedEmailProcessed: "Usuário aprovado e email de notificação processado.",
    userActivatedEmailProcessed: "Usuário ativado e email de notificação processado.",
    userDeniedEmailProcessed: "Usuário negado e email de notificação processado.",
    userSuspendedEmailProcessed: "Usuário suspenso e email de notificação processado.",
    confirmDenyTitle: "Negar este usuário?",
    confirmDenyBody: "Esta solicitação de conta será negada. O usuário não poderá entrar.",
    cancel: "Cancelar",
    confirmDeny: "Sim, negar usuário",
    rejectionReason: "Motivo da rejeição",
    viewPendingAccounts: "Gerencie solicitações de conta, aprovações e status de acesso.",
    passwordHelp: "Use pelo menos 8 caracteres.",
    loginRequired: "Entre ou continue como convidado para acessar os cenários.",
    heroTitle: "Crie confiança para situações do dia a dia",
    heroSubtitle: "Pratique situações do dia a dia passo a passo.",
    stepFoundation: "Base de autenticação da etapa 2",
    footerStatus: "E necessário entrar ou usar modo convidado para acessar os cenários",
    scenarioCatalogueTitle: "Catálogo de cenários",
    scenarioCatalogueSubtitle: "Escolha uma situação do dia a dia para abrir sua página provisória.",
    loadingScenarios: "Carregando cenários...",
    backendError: "Não foi possível acessar o backend do ASSIST-AI. Inicie o backend e atualize está página.",
    openScenario: "Abrir cenário",
    available: "Disponível",
    comingSoon: "Em breve",
    scenarioNotFound: "Cenário não encontrado",
    scenarioNotFoundBody: "O cenário solicitado não está disponível.",
    scenarioNextStep: "Este cenário será implementado nas próximas etapas.",
    backToScenarios: "Voltar aos cenários",
    voiceCredits: "TTS",
    speechCredits: "STT",
    language: "Idioma",
  },
  fr: {
    login: "Connexion",
    createAccount: "Créer un compte",
    continueAsGuest: "Continuer comme invité",
    viewScenarios: "Voir les scénarios",
    scenarios: "Scénarios",
    profile: "Profil",
    role: "Rôle",
    logout: "Déconnexion",
    fullName: "Nom complet",
    email: "E-mail",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    preferredLanguage: "Langue préférée",
    userCategory: "Catégorie d'utilisateur",
    personalUser: "Utilisateur personnel",
    familyCaregiver: "Famille / aidant",
    institution: "Institution / organisation",
    professional: "Professionnel / éducateur",
    registerTitle: "Crée ton compte",
    registerSubtitle: "Choisis ta catégorie pour qu'ASSIST-AI prépare plus tard l'expérience adaptée.",
    loginTitle: "Bon retour",
    loginSubtitle: "Connecte-toi pour continuer vers le catalogue de scénarios.",
    guestTitle: "Continuer comme invité",
    guestQuestion: "Veux-tu enregistrer ta progression pendant cette session ?",
    saveProgress: "Continuer et enregistrer la progression",
    continueWithoutSaving: "Continuer sans enregistrer",
    profileTitle: "Profil",
    guestMode: "Mode invité",
    saveProgressLabel: "Enregistrer la progression",
    yes: "Oui",
    no: "Non",
    authFormError: "Vérifie tes informations puis réessaie.",
    accountRequestSent: "Ta demande de compte a été envoyée pour approbation admin. Tu recevras une notification après examen.",
    pendingApprovalMessage: "Ton compte attend l'approbation admin.",
    deniedAccountMessage: "Ta demande de compte n'a pas été approuvée.",
    suspendedAccountMessage: "Ton compte est suspendu.",
    accessDenied: "Accès refusé.",
    adminUsers: "Tableau admin",
    approvalStatus: "Statut d'approbation",
    createdDate: "Date de création",
    pending: "En attente",
    approved: "Approuvé",
    denied: "Refusé",
    suspended: "Suspendu",
    all: "Tous",
    approve: "Approuver",
    activate: "Activer",
    deny: "Refuser",
    suspend: "Suspendre",
    userApprovedEmailProcessed: "Utilisateur approuvé et e-mail de notification traité.",
    userActivatedEmailProcessed: "Utilisateur activé et e-mail de notification traité.",
    userDeniedEmailProcessed: "Utilisateur refusé et e-mail de notification traité.",
    userSuspendedEmailProcessed: "Utilisateur suspendu et e-mail de notification traité.",
    confirmDenyTitle: "Refuser cet utilisateur ?",
    confirmDenyBody: "Cette demande de compte sera refusée. L'utilisateur ne pourra pas se connecter.",
    cancel: "Annuler",
    confirmDeny: "Oui, refuser l'utilisateur",
    rejectionReason: "Raison du refus",
    viewPendingAccounts: "Gère les demandes de compte, les approbations et le statut d'accès.",
    passwordHelp: "Utilise au moins 8 caractères.",
    loginRequired: "Connecte-toi ou continue comme invité pour accéder aux scénarios.",
    heroTitle: "Gagner en confiance dans les situations du quotidien",
    heroSubtitle: "Entraîne-toi aux situations du quotidien étape par étape.",
    stepFoundation: "Fondation d'authentification de l'étape 2",
    footerStatus: "Connexion ou mode invité requis pour accéder aux scénarios",
    scenarioCatalogueTitle: "Catalogue de scénarios",
    scenarioCatalogueSubtitle: "Choisis une situation du quotidien pour ouvrir sa page provisoire.",
    loadingScenarios: "Chargement des scénarios...",
    backendError: "Impossible de joindre le backend ASSIST-AI. Lance le backend puis actualise cette page.",
    openScenario: "Ouvrir le scénario",
    available: "Disponible",
    comingSoon: "Bientôt disponible",
    scenarioNotFound: "Scénario introuvable",
    scenarioNotFoundBody: "Le scénario demandé n'est pas disponible.",
    scenarioNextStep: "Ce scénario sera implémenté dans les prochaines étapes.",
    backToScenarios: "Retour aux scénarios",
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
    "restaurant-ordering": { title: "Pedir en un restaurante", description: "Pide una comida y elige una alternativa cuando el plato solicitado no está disponible." },
    "public-transport": { title: "Usar transporte público", description: "Identifica el transporte correcto, valida un billete y pide indicaciones si es necesario." },
    "atm-withdrawal": { title: "Retirar dinero de un cajero automático", description: "Retira una cantidad fija y responde con calma a una situación de error simple." },
    "time-off-overwhelmed": { title: "Pedir tiempo libre cuando te sientes abrumado", description: "Practica cómo pedir a un jefe un descanso breve o un día libre cuando te sientes abrumado." },
    "online-bill-payment": { title: "Pagar una factura en línea", description: "Inicia sesión, selecciona una factura, completa el pago y confirma el éxito." },
    "weekly-spending-plan": { title: "Crear un plan semanal de gastos", description: "Crea un presupuesto semanal y divide los gastos en categorías simples." },
    "consoling-a-friend": { title: "Consolar a un amigo", description: "Escucha a un amigo que comparte algo triste y responde de forma adecuada." },
    "managing-delay-calmly": { title: "Gestionar una demora con calma", description: "Responde con calma ante una cita o servicio retrasado." },
    "conflict-perspective-taking": { title: "Conflicto y toma de perspectiva", description: "Comprende una crítica o desacuerdo y elige una respuesta tranquila." },
    "short-team-discussion": { title: "Participar en una breve reunión de equipo", description: "Escucha, espera tu turno, expresa una opinión y responde de forma adecuada." },
  },
  de: {
    shopping: { title: "Einkaufen", description: "Bitte eine Verkaufskraft um Hilfe, ein Produkt zu finden." },
    "cinema-theatre-tickets": { title: "Kino- / Theaterkarten", description: "Bitte um einen Sitzplatzwechsel, weil der zugewiesene Sitz ein Problem hat." },
    "restaurant-ordering": { title: "Im Restaurant bestellen", description: "Bestelle ein Essen und wähle eine Alternative, wenn das gewünschte Gericht nicht verfügbar ist." },
    "public-transport": { title: "Öffentliche Verkehrsmittel nutzen", description: "Finde das richtige Verkehrsmittel, entwerte ein Ticket und frage bei Bedarf nach dem Weg." },
    "atm-withdrawal": { title: "Geld am Geldautomaten abheben", description: "Hebe einen festen Betrag ab und reagiere ruhig auf eine einfache Fehlersituation." },
    "time-off-overwhelmed": { title: "Um freie Zeit bitten, wenn du überfordert bist", description: "Übe, wie du deinen Vorgesetzten um eine kurze Pause oder einen freien Tag bittest." },
    "online-bill-payment": { title: "Eine Rechnung online bezahlen", description: "Melde dich an, wähle eine Rechnung aus, schließe die Zahlung ab und bestätige den Erfolg." },
    "weekly-spending-plan": { title: "Einen wöchentlichen Ausgabenplan erstellen", description: "Erstelle ein Wochenbudget und teile Ausgaben in einfache Kategorien ein." },
    "consoling-a-friend": { title: "Einen Freund trösten", description: "Höre einem Freund zu, der etwas Trauriges erzählt, und antworte angemessen." },
    "managing-delay-calmly": { title: "Ruhig mit einer Verzögerung umgehen", description: "Reagiere ruhig auf einen verspäteten Termin oder Service." },
    "conflict-perspective-taking": { title: "Konflikt und Perspektivwechsel", description: "Verstehe Kritik oder Meinungsverschiedenheiten und wähle eine ruhige Antwort." },
    "short-team-discussion": { title: "An einer kurzen Teambesprechung teilnehmen", description: "Höre zu, warte, bis du an der Reihe bist, äußere eine Meinung und antworte angemessen." },
  },
  tr: {
    shopping: { title: "Alışveriş", description: "Bir ürünü bulmak için mağaza görevlisinden yardım iste." },
    "cinema-theatre-tickets": { title: "Sinema / Tiyatro Biletleri", description: "Atanan koltukta sorun olduğu için koltuk değişikliği iste." },
    "restaurant-ordering": { title: "Restoranda Sipariş Verme", description: "Yemek siparişi ver ve istediğin yemek yoksa bir alternatif seç." },
    "public-transport": { title: "Toplu Taşıma Kullanma", description: "Doğru ulaşımı belirle, bileti doğrula ve gerekirse yol tarifi iste." },
    "atm-withdrawal": { title: "ATM'den Para Çekme", description: "Belirli bir miktar para çek ve basit bir hata durumuna sakin yanıt ver." },
    "time-off-overwhelmed": { title: "Bunalmışken İzin İsteme", description: "Bunalmış hissettiğinde yöneticinden kısa bir mola veya bir gün izin istemeyi pratik yap." },
    "online-bill-payment": { title: "Çevrim İçi Fatura Ödeme", description: "Giriş yap, faturayı seç, ödemeyi tamamla ve başarılı olduğunu doğrula." },
    "weekly-spending-plan": { title: "Haftalık Harcama Planı Oluşturma", description: "Haftalık bütçe oluştur ve giderleri basit kategorilere ayır." },
    "consoling-a-friend": { title: "Bir Arkadaşı Teselli Etme", description: "Üzgün bir şey paylaşan arkadaşını dinle ve uygun şekilde yanıt ver." },
    "managing-delay-calmly": { title: "Gecikmeyi Sakin Yönetme", description: "Geciken bir randevuya veya hizmete sakin şekilde yanıt ver." },
    "conflict-perspective-taking": { title: "Çatışma ve Bakış Açısı Alma", description: "Eleştiriyi veya anlaşmazlığı anla ve sakin bir yanıt seç." },
    "short-team-discussion": { title: "İşte Kısa Bir Takım Tartışmasına Katılma", description: "Dinle, sıranı bekle, bir görüş ifade et ve uygun şekilde yanıt ver." },
  },
  pt: {
    shopping: { title: "Compras", description: "Peça ajuda a um atendente para encontrar um produto." },
    "cinema-theatre-tickets": { title: "Ingressos de cinema / teatro", description: "Peça uma troca de assento porque o assento designado tem um problema." },
    "restaurant-ordering": { title: "Pedido em restaurante", description: "Peça uma refeição e escolha uma alternativa quando o prato desejado não estiver disponível." },
    "public-transport": { title: "Usar transporte público", description: "Identifique o transporte correto, valide um bilhete e peça direções se necessário." },
    "atm-withdrawal": { title: "Sacar dinheiro em um caixa eletrônico", description: "Saque um valor fixo e responda com calma a uma situação simples de erro." },
    "time-off-overwhelmed": { title: "Pedir folga quando estiver sobrecarregado", description: "Pratique como pedir ao chefe uma pausa curta ou um dia de folga quando estiver sobrecarregado." },
    "online-bill-payment": { title: "Pagar uma conta online", description: "Entre, selecione uma conta, conclua o pagamento e confirme o sucesso." },
    "weekly-spending-plan": { title: "Criar um plano semanal de gastos", description: "Crie um orçamento semanal e divida as despesas em categorias simples." },
    "consoling-a-friend": { title: "Consolar um amigo", description: "Ouça um amigo que compartilha algo triste e responda de forma adequada." },
    "managing-delay-calmly": { title: "Lidar com um atraso com calma", description: "Responda com calma a uma consulta ou serviço atrasado." },
    "conflict-perspective-taking": { title: "Conflito e tomada de perspectiva", description: "Entenda uma crítica ou discordância e escolha uma resposta calma." },
    "short-team-discussion": { title: "Participar de uma breve discussão em equipe", description: "Ouça, espere sua vez, expresse uma opinião e responda de forma adequada." },
  },
  fr: {
    shopping: { title: "Faire des achats", description: "Demande de l'aide à un vendeur pour trouver un produit." },
    "cinema-theatre-tickets": { title: "Billets de cinéma / théâtre", description: "Demande à changer de siège parce que le siège attribué a un problème." },
    "restaurant-ordering": { title: "Commander au restaurant", description: "Commande un repas et choisis une alternative si le plat demandé n'est pas disponible." },
    "public-transport": { title: "Prendre les transports en commun", description: "Identifie le bon transport, valide un ticket et demande ton chemin si nécessaire." },
    "atm-withdrawal": { title: "Retirer de l'argent à un distributeur", description: "Retire un montant fixe et réponds calmement à une situation d'erreur simple." },
    "time-off-overwhelmed": { title: "Demander du temps libre quand on se sent dépassé", description: "Entraîne-toi à demander à un responsable une courte pause ou un jour de repos." },
    "online-bill-payment": { title: "Payer une facture en ligne", description: "Connecte-toi, sélectionne une facture, effectue le paiement et confirme la réussite." },
    "weekly-spending-plan": { title: "Créer un plan de dépenses hebdomadaire", description: "Crée un budget hebdomadaire et répartis les dépenses en catégories simples." },
    "consoling-a-friend": { title: "Consoler un ami", description: "Écoute un ami qui partage quelque chose de triste et réponds de façon appropriée." },
    "managing-delay-calmly": { title: "Gérer calmement un retard", description: "Réponds calmement à un rendez-vous ou un service retardé." },
    "conflict-perspective-taking": { title: "Conflit et prise de perspective", description: "Comprends une critique ou un désaccord et choisis une réponse calme." },
    "short-team-discussion": { title: "Participer à une courte discussion d'équipe", description: "Écoute, attends ton tour, exprime une opinion et réponds de façon appropriée." },
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
