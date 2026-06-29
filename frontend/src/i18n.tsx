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
  | "scenarios"
  | "heroTitle"
  | "heroSubtitle"
  | "stepFoundation"
  | "footerStatus"
  | "scenarioCatalogueTitle"
  | "scenarioCatalogueSubtitle"
  | "loadingScenarios"
  | "backendError"
  | "openScenario"
  | "scenarioNotFound"
  | "scenarioNotFoundBody"
  | "scenarioNextStep"
  | "backToScenarios"
  | "language";

type ScenarioText = Pick<Scenario, "title" | "description">;

export const languages: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "tr", label: "Türkçe" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
];

const uiTranslations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    login: "Login",
    createAccount: "Create Account",
    continueAsGuest: "Continue as Guest",
    scenarios: "Scenarios",
    heroTitle: "Build confidence for everyday situations",
    heroSubtitle: "Practice everyday situations step by step.",
    stepFoundation: "Step 1 foundation",
    footerStatus: "Login required to access scenarios",
    scenarioCatalogueTitle: "Scenario Catalogue",
    scenarioCatalogueSubtitle:
      "Choose one everyday situation to open its placeholder page. Detailed practice flows will be implemented in the next steps.",
    loadingScenarios: "Loading scenarios...",
    backendError:
      "We could not reach the ASSIST-AI backend. Please start the backend and refresh this page.",
    openScenario: "Open scenario",
    scenarioNotFound: "Scenario not found",
    scenarioNotFoundBody: "The scenario you requested is not available.",
    scenarioNextStep: "This scenario will be implemented in the next steps.",
    backToScenarios: "Back to scenarios",
    language: "Language",
  },
  es: {
    login: "Iniciar sesión",
    createAccount: "Crear cuenta",
    continueAsGuest: "Continuar como invitado",
    scenarios: "Escenarios",
    heroTitle: "Desarrolla confianza para situaciones cotidianas",
    heroSubtitle: "Practica situaciones cotidianas paso a paso.",
    stepFoundation: "Base del paso 1",
    footerStatus: "Se requiere iniciar sesión para acceder a los escenarios",
    scenarioCatalogueTitle: "Catálogo de escenarios",
    scenarioCatalogueSubtitle:
      "Elige una situación cotidiana para abrir su página provisional. Los flujos de práctica detallados se implementarán en los próximos pasos.",
    loadingScenarios: "Cargando escenarios...",
    backendError:
      "No pudimos conectar con el backend de ASSIST-AI. Inicia el backend y actualiza esta página.",
    openScenario: "Abrir escenario",
    scenarioNotFound: "Escenario no encontrado",
    scenarioNotFoundBody: "El escenario solicitado no está disponible.",
    scenarioNextStep: "Este escenario se implementará en los próximos pasos.",
    backToScenarios: "Volver a escenarios",
    language: "Idioma",
  },
  de: {
    login: "Anmelden",
    createAccount: "Konto erstellen",
    continueAsGuest: "Als Gast fortfahren",
    scenarios: "Szenarien",
    heroTitle: "Mehr Sicherheit in Alltagssituationen aufbauen",
    heroSubtitle: "Übe Alltagssituationen Schritt für Schritt.",
    stepFoundation: "Grundlage für Schritt 1",
    footerStatus: "Für den Zugriff auf Szenarien ist eine Anmeldung erforderlich",
    scenarioCatalogueTitle: "Szenario-Katalog",
    scenarioCatalogueSubtitle:
      "Wähle eine Alltagssituation, um die Platzhalterseite zu öffnen. Detaillierte Übungsabläufe werden in den nächsten Schritten umgesetzt.",
    loadingScenarios: "Szenarien werden geladen...",
    backendError:
      "Das ASSIST-AI-Backend konnte nicht erreicht werden. Bitte starte das Backend und lade diese Seite neu.",
    openScenario: "Szenario öffnen",
    scenarioNotFound: "Szenario nicht gefunden",
    scenarioNotFoundBody: "Das angeforderte Szenario ist nicht verfügbar.",
    scenarioNextStep: "Dieses Szenario wird in den nächsten Schritten umgesetzt.",
    backToScenarios: "Zurück zu den Szenarien",
    language: "Sprache",
  },
  tr: {
    login: "Giriş yap",
    createAccount: "Hesap oluştur",
    continueAsGuest: "Misafir olarak devam et",
    scenarios: "Senaryolar",
    heroTitle: "Günlük durumlar için özgüven kazan",
    heroSubtitle: "Günlük durumları adım adım pratik yap.",
    stepFoundation: "1. adım temeli",
    footerStatus: "Senaryolara erişmek için giriş yapmak gerekir",
    scenarioCatalogueTitle: "Senaryo Kataloğu",
    scenarioCatalogueSubtitle:
      "Yer tutucu sayfasını açmak için bir günlük durum seç. Ayrıntılı pratik akışları sonraki adımlarda eklenecek.",
    loadingScenarios: "Senaryolar yükleniyor...",
    backendError:
      "ASSIST-AI backendine ulaşılamadı. Lütfen backend'i başlatıp sayfayı yenile.",
    openScenario: "Senaryoyu aç",
    scenarioNotFound: "Senaryo bulunamadı",
    scenarioNotFoundBody: "İstediğin senaryo kullanılamıyor.",
    scenarioNextStep: "Bu senaryo sonraki adımlarda uygulanacak.",
    backToScenarios: "Senaryolara dön",
    language: "Dil",
  },
  pt: {
    login: "Entrar",
    createAccount: "Criar conta",
    continueAsGuest: "Continuar como convidado",
    scenarios: "Cenários",
    heroTitle: "Crie confiança para situações do dia a dia",
    heroSubtitle: "Pratique situações do dia a dia passo a passo.",
    stepFoundation: "Base da etapa 1",
    footerStatus: "É necessário entrar para acessar os cenários",
    scenarioCatalogueTitle: "Catálogo de cenários",
    scenarioCatalogueSubtitle:
      "Escolha uma situação do dia a dia para abrir sua página provisória. Os fluxos de prática detalhados serão implementados nas próximas etapas.",
    loadingScenarios: "Carregando cenários...",
    backendError:
      "Não foi possível acessar o backend do ASSIST-AI. Inicie o backend e atualize esta página.",
    openScenario: "Abrir cenário",
    scenarioNotFound: "Cenário não encontrado",
    scenarioNotFoundBody: "O cenário solicitado não está disponível.",
    scenarioNextStep: "Este cenário será implementado nas próximas etapas.",
    backToScenarios: "Voltar aos cenários",
    language: "Idioma",
  },
  fr: {
    login: "Connexion",
    createAccount: "Créer un compte",
    continueAsGuest: "Continuer comme invité",
    scenarios: "Scénarios",
    heroTitle: "Gagner en confiance dans les situations du quotidien",
    heroSubtitle: "Entraîne-toi aux situations du quotidien étape par étape.",
    stepFoundation: "Fondation de l'étape 1",
    footerStatus: "La connexion est requise pour accéder aux scénarios",
    scenarioCatalogueTitle: "Catalogue de scénarios",
    scenarioCatalogueSubtitle:
      "Choisis une situation du quotidien pour ouvrir sa page provisoire. Les parcours de pratique détaillés seront ajoutés dans les prochaines étapes.",
    loadingScenarios: "Chargement des scénarios...",
    backendError:
      "Impossible de joindre le backend ASSIST-AI. Lance le backend puis actualise cette page.",
    openScenario: "Ouvrir le scénario",
    scenarioNotFound: "Scénario introuvable",
    scenarioNotFoundBody: "Le scénario demandé n'est pas disponible.",
    scenarioNextStep: "Ce scénario sera implémenté dans les prochaines étapes.",
    backToScenarios: "Retour aux scénarios",
    language: "Langue",
  },
};

const scenarioTranslations: Record<LanguageCode, Record<string, ScenarioText>> = {
  en: {},
  es: {
    shopping: {
      title: "Compras",
      description: "Pide ayuda a un dependiente para encontrar un producto.",
    },
    "cinema-theatre-tickets": {
      title: "Entradas de cine / teatro",
      description: "Solicita un cambio de asiento porque el asiento asignado tiene un problema.",
    },
    "restaurant-ordering": {
      title: "Pedir en un restaurante",
      description: "Pide una comida y elige una alternativa cuando el plato solicitado no está disponible.",
    },
    "public-transport": {
      title: "Usar transporte público",
      description: "Identifica el transporte correcto, valida un billete y pide indicaciones si es necesario.",
    },
    "atm-withdrawal": {
      title: "Retirar dinero de un cajero automático",
      description: "Retira una cantidad fija y responde con calma a una situación de error simple.",
    },
    "time-off-overwhelmed": {
      title: "Pedir tiempo libre cuando te sientes abrumado",
      description: "Practica cómo pedir a un jefe un descanso breve o un día libre cuando te sientes abrumado.",
    },
    "online-bill-payment": {
      title: "Pagar una factura en línea",
      description: "Inicia sesión, selecciona una factura, completa el pago y confirma el éxito.",
    },
    "weekly-spending-plan": {
      title: "Crear un plan semanal de gastos",
      description: "Crea un presupuesto semanal y divide los gastos en categorías simples.",
    },
    "consoling-a-friend": {
      title: "Consolar a un amigo",
      description: "Escucha a un amigo que comparte algo triste y responde de forma adecuada.",
    },
    "managing-delay-calmly": {
      title: "Gestionar una demora con calma",
      description: "Responde con calma ante una cita o servicio retrasado.",
    },
    "conflict-perspective-taking": {
      title: "Conflicto y toma de perspectiva",
      description: "Comprende una crítica o desacuerdo y elige una respuesta tranquila.",
    },
    "short-team-discussion": {
      title: "Participar en una breve reunión de equipo",
      description: "Escucha, espera tu turno, expresa una opinión y responde de forma adecuada.",
    },
  },
  de: {
    shopping: {
      title: "Einkaufen",
      description: "Bitte eine Verkaufskraft um Hilfe, ein Produkt zu finden.",
    },
    "cinema-theatre-tickets": {
      title: "Kino- / Theaterkarten",
      description: "Bitte um einen Sitzplatzwechsel, weil der zugewiesene Sitz ein Problem hat.",
    },
    "restaurant-ordering": {
      title: "Im Restaurant bestellen",
      description: "Bestelle ein Essen und wähle eine Alternative, wenn das gewünschte Gericht nicht verfügbar ist.",
    },
    "public-transport": {
      title: "Öffentliche Verkehrsmittel nutzen",
      description: "Finde das richtige Verkehrsmittel, entwerte ein Ticket und frage bei Bedarf nach dem Weg.",
    },
    "atm-withdrawal": {
      title: "Geld am Geldautomaten abheben",
      description: "Hebe einen festen Betrag ab und reagiere ruhig auf eine einfache Fehlersituation.",
    },
    "time-off-overwhelmed": {
      title: "Um freie Zeit bitten, wenn du überfordert bist",
      description: "Übe, wie du deinen Vorgesetzten um eine kurze Pause oder einen freien Tag bittest.",
    },
    "online-bill-payment": {
      title: "Eine Rechnung online bezahlen",
      description: "Melde dich an, wähle eine Rechnung aus, schließe die Zahlung ab und bestätige den Erfolg.",
    },
    "weekly-spending-plan": {
      title: "Einen wöchentlichen Ausgabenplan erstellen",
      description: "Erstelle ein Wochenbudget und teile Ausgaben in einfache Kategorien ein.",
    },
    "consoling-a-friend": {
      title: "Einen Freund trösten",
      description: "Höre einem Freund zu, der etwas Trauriges erzählt, und antworte angemessen.",
    },
    "managing-delay-calmly": {
      title: "Ruhig mit einer Verzögerung umgehen",
      description: "Reagiere ruhig auf einen verspäteten Termin oder Service.",
    },
    "conflict-perspective-taking": {
      title: "Konflikt und Perspektivwechsel",
      description: "Verstehe Kritik oder Meinungsverschiedenheiten und wähle eine ruhige Antwort.",
    },
    "short-team-discussion": {
      title: "An einer kurzen Teambesprechung teilnehmen",
      description: "Höre zu, warte, bis du an der Reihe bist, äußere eine Meinung und antworte angemessen.",
    },
  },
  tr: {
    shopping: {
      title: "Alışveriş",
      description: "Bir ürünü bulmak için mağaza görevlisinden yardım iste.",
    },
    "cinema-theatre-tickets": {
      title: "Sinema / Tiyatro Biletleri",
      description: "Atanan koltukta sorun olduğu için koltuk değişikliği iste.",
    },
    "restaurant-ordering": {
      title: "Restoranda Sipariş Verme",
      description: "Yemek siparişi ver ve istediğin yemek yoksa bir alternatif seç.",
    },
    "public-transport": {
      title: "Toplu Taşıma Kullanma",
      description: "Doğru ulaşımı belirle, bileti doğrula ve gerekirse yol tarifi iste.",
    },
    "atm-withdrawal": {
      title: "ATM'den Para Çekme",
      description: "Belirli bir miktar para çek ve basit bir hata durumuna sakin yanıt ver.",
    },
    "time-off-overwhelmed": {
      title: "Bunalmışken İzin İsteme",
      description: "Bunalmış hissettiğinde yöneticinden kısa bir mola veya bir gün izin istemeyi pratik yap.",
    },
    "online-bill-payment": {
      title: "Çevrim İçi Fatura Ödeme",
      description: "Giriş yap, faturayı seç, ödemeyi tamamla ve başarılı olduğunu doğrula.",
    },
    "weekly-spending-plan": {
      title: "Haftalık Harcama Planı Oluşturma",
      description: "Haftalık bütçe oluştur ve giderleri basit kategorilere ayır.",
    },
    "consoling-a-friend": {
      title: "Bir Arkadaşı Teselli Etme",
      description: "Üzgün bir şey paylaşan arkadaşını dinle ve uygun şekilde yanıt ver.",
    },
    "managing-delay-calmly": {
      title: "Gecikmeyi Sakin Yönetme",
      description: "Geciken bir randevuya veya hizmete sakin şekilde yanıt ver.",
    },
    "conflict-perspective-taking": {
      title: "Çatışma ve Bakış Açısı Alma",
      description: "Eleştiriyi veya anlaşmazlığı anla ve sakin bir yanıt seç.",
    },
    "short-team-discussion": {
      title: "İşte Kısa Bir Takım Tartışmasına Katılma",
      description: "Dinle, sıranı bekle, bir görüş ifade et ve uygun şekilde yanıt ver.",
    },
  },
  pt: {
    shopping: {
      title: "Compras",
      description: "Peça ajuda a um atendente para encontrar um produto.",
    },
    "cinema-theatre-tickets": {
      title: "Ingressos de cinema / teatro",
      description: "Peça uma troca de assento porque o assento designado tem um problema.",
    },
    "restaurant-ordering": {
      title: "Pedido em restaurante",
      description: "Peça uma refeição e escolha uma alternativa quando o prato desejado não estiver disponível.",
    },
    "public-transport": {
      title: "Usar transporte público",
      description: "Identifique o transporte correto, valide um bilhete e peça direções se necessário.",
    },
    "atm-withdrawal": {
      title: "Sacar dinheiro em um caixa eletrônico",
      description: "Saque um valor fixo e responda com calma a uma situação simples de erro.",
    },
    "time-off-overwhelmed": {
      title: "Pedir folga quando estiver sobrecarregado",
      description: "Pratique como pedir ao chefe uma pausa curta ou um dia de folga quando estiver sobrecarregado.",
    },
    "online-bill-payment": {
      title: "Pagar uma conta online",
      description: "Entre, selecione uma conta, conclua o pagamento e confirme o sucesso.",
    },
    "weekly-spending-plan": {
      title: "Criar um plano semanal de gastos",
      description: "Crie um orçamento semanal e divida as despesas em categorias simples.",
    },
    "consoling-a-friend": {
      title: "Consolar um amigo",
      description: "Ouça um amigo que compartilha algo triste e responda de forma adequada.",
    },
    "managing-delay-calmly": {
      title: "Lidar com um atraso com calma",
      description: "Responda com calma a uma consulta ou serviço atrasado.",
    },
    "conflict-perspective-taking": {
      title: "Conflito e tomada de perspectiva",
      description: "Entenda uma crítica ou discordância e escolha uma resposta calma.",
    },
    "short-team-discussion": {
      title: "Participar de uma breve discussão em equipe",
      description: "Ouça, espere sua vez, expresse uma opinião e responda de forma adequada.",
    },
  },
  fr: {
    shopping: {
      title: "Faire des achats",
      description: "Demande de l'aide à un vendeur pour trouver un produit.",
    },
    "cinema-theatre-tickets": {
      title: "Billets de cinéma / théâtre",
      description: "Demande à changer de siège parce que le siège attribué a un problème.",
    },
    "restaurant-ordering": {
      title: "Commander au restaurant",
      description: "Commande un repas et choisis une alternative si le plat demandé n'est pas disponible.",
    },
    "public-transport": {
      title: "Prendre les transports en commun",
      description: "Identifie le bon transport, valide un ticket et demande ton chemin si nécessaire.",
    },
    "atm-withdrawal": {
      title: "Retirer de l'argent à un distributeur",
      description: "Retire un montant fixe et réponds calmement à une situation d'erreur simple.",
    },
    "time-off-overwhelmed": {
      title: "Demander du temps libre quand on se sent dépassé",
      description: "Entraîne-toi à demander à un responsable une courte pause ou un jour de repos.",
    },
    "online-bill-payment": {
      title: "Payer une facture en ligne",
      description: "Connecte-toi, sélectionne une facture, effectue le paiement et confirme la réussite.",
    },
    "weekly-spending-plan": {
      title: "Créer un plan de dépenses hebdomadaire",
      description: "Crée un budget hebdomadaire et répartis les dépenses en catégories simples.",
    },
    "consoling-a-friend": {
      title: "Consoler un ami",
      description: "Écoute un ami qui partage quelque chose de triste et réponds de façon appropriée.",
    },
    "managing-delay-calmly": {
      title: "Gérer calmement un retard",
      description: "Réponds calmement à un rendez-vous ou un service retardé.",
    },
    "conflict-perspective-taking": {
      title: "Conflit et prise de perspective",
      description: "Comprends une critique ou un désaccord et choisis une réponse calme.",
    },
    "short-team-discussion": {
      title: "Participer à une courte discussion d'équipe",
      description: "Écoute, attends ton tour, exprime une opinion et réponds de façon appropriée.",
    },
  },
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("en");

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
