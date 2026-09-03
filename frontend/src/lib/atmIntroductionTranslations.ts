import type { LanguageCode } from "../i18n";

export type AtmIntroductionText = {
  simpleTitle: string;
  simpleSubtitle: string;
  assistantMode: string;
  assistantMessage: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  whatWillHappen: string;
  steps: Array<{ title: string; body: string }>;
  waysToRespond: string;
  keypadTitle: string;
  keypadBody: string;
  voiceTitle: string;
  voiceBody: string;
  safetyTitle: string;
  safetyBody: string;
  reassurance: string;
  back: string;
  start: string;
  atmPreviewAlt: string;
};

export const atmIntroductionTranslations: Record<LanguageCode, AtmIntroductionText> = {
  en: {
    simpleTitle: "Welcome to the ATM",
    simpleSubtitle: "Listen to the assistant, then select Start when you are ready.",
    assistantMode: "ATM introduction",
    assistantMessage: "Welcome. In this activity, you will use an ATM to check your account or withdraw money. The assistant will guide you step by step. You can use the microphone, the ATM keypad, or your computer keyboard. Select Start when you are ready.",
    eyebrow: "Before you begin",
    title: "How the ATM scenario works",
    subtitle: "Follow a complete ATM journey, from creating your session details to safely collecting your cash and card.",
    whatWillHappen: "Your ATM journey",
    steps: [
      { title: "Create your session", body: "Enter your full name and create the four-digit PIN you will use at the ATM." },
      { title: "Insert and verify your card", body: "Select the card slot, wait for the card to enter, and enter your PIN. You have three attempts." },
      { title: "Choose a service", body: "Withdraw money, view your account information, or leave the ATM and retrieve your card." },
      { title: "Complete your withdrawal", body: "Choose, type, or say an amount, confirm it, choose whether to print a receipt, and collect your cash." },
      { title: "Finish safely", body: "Make another transaction or finish and take your card. Inactivity warnings appear every 15 seconds, and the session ends after one minute." },
    ],
    waysToRespond: "Ways to respond",
    keypadTitle: "ATM buttons",
    keypadBody: "Use the ATM keypad or your computer keyboard for PINs and amounts. Use Back where available to return to the menu.",
    voiceTitle: "Voice input",
    voiceBody: "Hold a microphone button while speaking and release it to stop. On supported screens, you can also hold the Space key.",
    safetyTitle: "Use simulation details only",
    safetyBody: "Use the name and PIN you create for this session. Never enter a real bank PIN, card number, or account information.",
    reassurance: "On-screen instructions, voice guidance, realistic sounds, and animations will guide you from start to finish.",
    back: "Back to scenarios",
    start: "Start ATM scenario",
    atmPreviewAlt: "Preview of the ASSIST-AI ATM",
  },
  es: {
    simpleTitle: "Te damos la bienvenida al cajero",
    simpleSubtitle: "Escucha al asistente y selecciona Iniciar cuando estés preparado.",
    assistantMode: "Introducción al cajero",
    assistantMessage: "Te damos la bienvenida. En esta actividad usarás un cajero para consultar tu cuenta o retirar dinero. El asistente te guiará paso a paso. Puedes usar el micrófono, el teclado del cajero o el teclado del ordenador. Selecciona Iniciar cuando estés preparado.",
    eyebrow: "Antes de empezar",
    title: "Cómo funciona el escenario del cajero",
    subtitle: "Sigue una experiencia completa en el cajero, desde la creación de los datos de la sesión hasta la recogida segura del dinero y la tarjeta.",
    whatWillHappen: "Tu recorrido en el cajero",
    steps: [
      { title: "Crea tu sesión", body: "Ingresa tu nombre completo y crea el PIN de cuatro dígitos que usarás en el cajero." },
      { title: "Inserta y verifica tu tarjeta", body: "Selecciona la ranura, espera a que entre la tarjeta e ingresa tu PIN. Tienes tres intentos." },
      { title: "Elige un servicio", body: "Retira dinero, consulta la información de tu cuenta o sal del cajero y recoge tu tarjeta." },
      { title: "Completa el retiro", body: "Elige, escribe o di una cantidad, confírmala, decide si quieres imprimir un recibo y recoge tu dinero." },
      { title: "Finaliza con seguridad", body: "Realiza otra operación o termina y recoge tu tarjeta. Recibirás avisos cada 15 segundos de inactividad y la sesión finalizará al minuto." },
    ],
    waysToRespond: "Formas de responder",
    keypadTitle: "Botones del cajero",
    keypadBody: "Usa el teclado del cajero o el del ordenador para introducir el PIN y las cantidades. Usa Atrás cuando esté disponible para volver al menú.",
    voiceTitle: "Entrada de voz",
    voiceBody: "Mantén pulsado un botón de micrófono mientras hablas y suéltalo para detenerlo. En las pantallas compatibles también puedes mantener pulsada la tecla Espacio.",
    safetyTitle: "Usa solo datos de simulación",
    safetyBody: "Usa el nombre y el PIN que crees para esta sesión. Nunca ingreses un PIN bancario, número de tarjeta o información de cuenta real.",
    reassurance: "Las instrucciones en pantalla, la guía por voz, los sonidos realistas y las animaciones te acompañarán de principio a fin.",
    back: "Volver a escenarios",
    start: "Iniciar escenario del cajero",
    atmPreviewAlt: "Vista previa del cajero ASSIST-AI",
  },
  de: {
    simpleTitle: "Willkommen am Geldautomaten",
    simpleSubtitle: "Höre dem Assistenten zu und wähle Start, wenn du bereit bist.",
    assistantMode: "Einführung zum Geldautomaten",
    assistantMessage: "Willkommen. In dieser Aktivität benutzt du einen Geldautomaten, um dein Konto anzusehen oder Geld abzuheben. Der Assistent führt dich Schritt für Schritt. Du kannst das Mikrofon, die Geldautomaten-Tastatur oder deine Computertastatur verwenden. Wähle Start, wenn du bereit bist.",
    eyebrow: "Bevor du beginnst",
    title: "So funktioniert das Geldautomaten-Szenario",
    subtitle: "Durchlaufe einen vollständigen Geldautomaten-Vorgang – vom Erstellen deiner Sitzungsdaten bis zur sicheren Entnahme von Bargeld und Karte.",
    whatWillHappen: "Dein Ablauf am Geldautomaten",
    steps: [
      { title: "Sitzung erstellen", body: "Gib deinen vollständigen Namen ein und erstelle die vierstellige PIN, die du am Geldautomaten verwendest." },
      { title: "Karte einführen und bestätigen", body: "Wähle den Kartenschlitz, warte auf das Einführen der Karte und gib deine PIN ein. Du hast drei Versuche." },
      { title: "Service auswählen", body: "Hebe Geld ab, sieh deine Kontoinformationen an oder verlasse den Geldautomaten und entnimm deine Karte." },
      { title: "Abhebung abschließen", body: "Wähle, tippe oder sage einen Betrag, bestätige ihn, entscheide dich für oder gegen einen Beleg und entnimm dein Bargeld." },
      { title: "Sicher beenden", body: "Führe eine weitere Transaktion aus oder beende die Sitzung und entnimm deine Karte. Nach jeweils 15 Sekunden Inaktivität erscheint eine Warnung; nach einer Minute endet die Sitzung." },
    ],
    waysToRespond: "Antwortmöglichkeiten",
    keypadTitle: "Tasten des Geldautomaten",
    keypadBody: "Nutze für PIN und Beträge die Geldautomaten-Tastatur oder deine Computertastatur. Mit Zurück gelangst du, wo verfügbar, zum Menü.",
    voiceTitle: "Spracheingabe",
    voiceBody: "Halte beim Sprechen eine Mikrofontaste gedrückt und lasse sie zum Stoppen los. Auf unterstützten Bildschirmen kannst du auch die Leertaste gedrückt halten.",
    safetyTitle: "Nur Simulationsdaten verwenden",
    safetyBody: "Verwende den Namen und die PIN, die du für diese Sitzung erstellst. Gib niemals eine echte Bank-PIN, Kartennummer oder Kontoinformation ein.",
    reassurance: "Bildschirmanweisungen, Sprachführung, realistische Geräusche und Animationen begleiten dich von Anfang bis Ende.",
    back: "Zurück zu den Szenarien",
    start: "Geldautomaten-Szenario starten",
    atmPreviewAlt: "Vorschau des ASSIST-AI Geldautomaten",
  },
  tr: {
    simpleTitle: "ATM'ye hoş geldiniz",
    simpleSubtitle: "Asistanı dinleyin ve hazır olduğunuzda Başlat düğmesine basın.",
    assistantMode: "ATM tanıtımı",
    assistantMessage: "Hoş geldiniz. Bu etkinlikte hesap bilgilerinizi kontrol etmek veya para çekmek için ATM kullanacaksınız. Asistan size adım adım yardımcı olacak. Mikrofonu, ATM tuş takımını veya bilgisayar klavyenizi kullanabilirsiniz. Hazır olduğunuzda Başlat düğmesine basın.",
    eyebrow: "Başlamadan önce",
    title: "ATM senaryosu nasıl çalışır?",
    subtitle: "Oturum bilgilerini oluşturmaktan paranı ve kartını güvenle almaya kadar eksiksiz bir ATM işlemini tamamla.",
    whatWillHappen: "ATM işlem adımların",
    steps: [
      { title: "Oturumunu oluştur", body: "Adını ve soyadını gir, ardından ATM'de kullanacağın dört haneli PIN'i oluştur." },
      { title: "Kartını tak ve doğrula", body: "Kart yuvasını seç, kartın yerleşmesini bekle ve PIN'ini gir. Üç deneme hakkın vardır." },
      { title: "İşlem seç", body: "Para çek, hesap bilgilerini görüntüle veya ATM'den ayrılıp kartını geri al." },
      { title: "Para çekme işlemini tamamla", body: "Bir tutar seç, yaz veya söyle; onayla, makbuz isteyip istemediğini seç ve paranı al." },
      { title: "Güvenle bitir", body: "Başka bir işlem yap veya işlemi bitirip kartını al. Her 15 saniyelik hareketsizlikte uyarı gösterilir ve bir dakika sonra oturum sona erer." },
    ],
    waysToRespond: "Yanıt verme yolları",
    keypadTitle: "ATM düğmeleri",
    keypadBody: "PIN ve tutarlar için ATM tuş takımını veya bilgisayar klavyeni kullan. Uygun ekranlarda Geri tuşuyla menüye dönebilirsin.",
    voiceTitle: "Sesli giriş",
    voiceBody: "Konuşurken mikrofon düğmesini basılı tut, dinlemeyi durdurmak için bırak. Desteklenen ekranlarda Boşluk tuşunu da basılı tutabilirsin.",
    safetyTitle: "Yalnızca simülasyon bilgilerini kullan",
    safetyBody: "Bu oturum için oluşturduğun adı ve PIN'i kullan. Gerçek banka PIN'i, kart numarası veya hesap bilgisi girme.",
    reassurance: "Ekrandaki talimatlar, sesli yönlendirme, gerçekçi sesler ve animasyonlar baştan sona sana rehberlik eder.",
    back: "Senaryolara dön",
    start: "ATM senaryosunu başlat",
    atmPreviewAlt: "ASSIST-AI ATM'sinin ön izlemesi",
  },
  pt: {
    simpleTitle: "Bem-vindo ao caixa eletrônico",
    simpleSubtitle: "Ouça o assistente e selecione Iniciar quando estiver pronto.",
    assistantMode: "Introdução ao caixa eletrônico",
    assistantMessage: "Bem-vindo. Nesta atividade, irá utilizar um caixa eletrônico para consultar a sua conta ou levantar dinheiro. O assistente irá orientá-lo passo a passo. Pode utilizar o microfone, o teclado do caixa eletrônico ou o teclado do computador. Selecione Iniciar quando estiver pronto.",
    eyebrow: "Antes de começar",
    title: "Como funciona o cenário do caixa eletrônico",
    subtitle: "Siga uma experiência completa no caixa eletrônico, desde a criação dos dados da sessão até à recolha segura do dinheiro e do cartão.",
    whatWillHappen: "O seu percurso no caixa eletrônico",
    steps: [
      { title: "Crie a sua sessão", body: "Introduza o nome completo e crie o PIN de quatro dígitos que utilizará no caixa eletrônico." },
      { title: "Insira e verifique o cartão", body: "Selecione a ranhura, aguarde a entrada do cartão e introduza o PIN. Tem três tentativas." },
      { title: "Escolha um serviço", body: "Levante dinheiro, consulte as informações da conta ou saia do caixa eletrônico e recolha o cartão." },
      { title: "Conclua o levantamento", body: "Escolha, escreva ou diga um valor, confirme-o, decida se deseja imprimir um recibo e recolha o dinheiro." },
      { title: "Termine em segurança", body: "Faça outra operação ou termine e recolha o cartão. Surgem avisos a cada 15 segundos de inatividade e a sessão termina após um minuto." },
    ],
    waysToRespond: "Formas de responder",
    keypadTitle: "Botões do caixa eletrônico",
    keypadBody: "Use o teclado do caixa eletrônico ou do computador para introduzir o PIN e os valores. Use Voltar, quando disponível, para regressar ao menu.",
    voiceTitle: "Entrada de voz",
    voiceBody: "Mantenha o botão do microfone pressionado enquanto fala e solte-o para parar. Nos ecrãs compatíveis, também pode manter a tecla Espaço pressionada.",
    safetyTitle: "Use apenas dados de simulação",
    safetyBody: "Use o nome e o PIN criados para esta sessão. Nunca introduza um PIN bancário, número de cartão ou informação de conta real.",
    reassurance: "As instruções no ecrã, a orientação por voz, os sons realistas e as animações acompanham-no do início ao fim.",
    back: "Voltar aos cenários",
    start: "Iniciar cenário do caixa eletrônico",
    atmPreviewAlt: "Pré-visualização do caixa eletrônico ASSIST-AI",
  },
  fr: {
    simpleTitle: "Bienvenue au distributeur",
    simpleSubtitle: "Écoute l'assistant, puis sélectionne Commencer lorsque tu es prêt.",
    assistantMode: "Présentation du distributeur",
    assistantMessage: "Bienvenue. Dans cette activité, tu vas utiliser un distributeur pour consulter ton compte ou retirer de l'argent. L'assistant te guidera étape par étape. Tu peux utiliser le microphone, le clavier du distributeur ou le clavier de ton ordinateur. Sélectionne Commencer lorsque tu es prêt.",
    eyebrow: "Avant de commencer",
    title: "Comment fonctionne le scénario au distributeur",
    subtitle: "Suis un parcours complet au distributeur, de la création des informations de session jusqu'à la récupération sécurisée de l'argent et de la carte.",
    whatWillHappen: "Ton parcours au distributeur",
    steps: [
      { title: "Crée ta session", body: "Saisis ton nom complet et crée le code PIN à quatre chiffres que tu utiliseras au distributeur." },
      { title: "Insère et vérifie ta carte", body: "Sélectionne la fente, attends l'insertion de la carte et saisis ton code PIN. Tu disposes de trois tentatives." },
      { title: "Choisis un service", body: "Retire de l'argent, consulte les informations de ton compte ou quitte le distributeur et récupère ta carte." },
      { title: "Effectue ton retrait", body: "Choisis, saisis ou prononce un montant, confirme-le, décide si tu souhaites imprimer un reçu et récupère ton argent." },
      { title: "Termine en sécurité", body: "Effectue une autre opération ou termine et récupère ta carte. Un avertissement apparaît toutes les 15 secondes d'inactivité et la session se termine après une minute." },
    ],
    waysToRespond: "Façons de répondre",
    keypadTitle: "Touches du distributeur",
    keypadBody: "Utilise le clavier du distributeur ou celui de ton ordinateur pour le code PIN et les montants. Utilise Retour, lorsqu'il est disponible, pour revenir au menu.",
    voiceTitle: "Saisie vocale",
    voiceBody: "Maintiens un bouton de microphone pendant que tu parles et relâche-le pour arrêter. Sur les écrans compatibles, tu peux aussi maintenir la touche Espace.",
    safetyTitle: "Utilise uniquement des données de simulation",
    safetyBody: "Utilise le nom et le code PIN créés pour cette session. Ne saisis jamais de vrai code PIN bancaire, numéro de carte ou information de compte.",
    reassurance: "Les instructions à l'écran, le guidage vocal, les sons réalistes et les animations t'accompagnent du début à la fin.",
    back: "Retour aux scénarios",
    start: "Commencer le scénario au distributeur",
    atmPreviewAlt: "Aperçu du distributeur ASSIST-AI",
  },
};
