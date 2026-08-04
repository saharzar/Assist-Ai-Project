import type { LanguageCode } from "../i18n";

export type AtmIntroductionText = {
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
    eyebrow: "Before you begin",
    title: "How the ATM practice works",
    subtitle: "Take a moment to see what will happen. There is no time limit, and you can repeat the assistant's message whenever you need.",
    whatWillHappen: "What you will do",
    steps: [
      { title: "Enter your name", body: "Type your full name or hold the microphone button and say it." },
      { title: "Use the practice PIN", body: "Enter the four-digit number shown by the assistant. A practice system message may ask you to try again." },
      { title: "Complete the name check", body: "Enter the two requested letters. This is only a practice security check." },
      { title: "Choose an amount", body: "Select, type, or say how much practice money you want to withdraw." },
      { title: "Confirm and finish", body: "Confirm the amount, review the remaining practice balance, and complete the scenario." },
    ],
    waysToRespond: "Ways to respond",
    keypadTitle: "ATM buttons",
    keypadBody: "Use the number pad, letter keys, Enter, Clear, Back, and Cancel directly on the ATM.",
    voiceTitle: "Voice input",
    voiceBody: "Hold a microphone button while speaking, then release it when you finish. You can also hold the Space key to activate the microphone.",
    safetyTitle: "Practice information only",
    safetyBody: "Never enter a real bank PIN, card number, account number, or real balance.",
    reassurance: "Mistakes are expected here. The assistant will explain what to do next.",
    back: "Back to scenarios",
    start: "Start ATM practice",
    atmPreviewAlt: "Preview of the ASSIST-AI practice ATM",
  },
  es: {
    eyebrow: "Antes de empezar",
    title: "Cómo funciona la práctica del cajero",
    subtitle: "Mira con calma lo que ocurrirá. No hay límite de tiempo y puedes repetir el mensaje del asistente cuando lo necesites.",
    whatWillHappen: "Lo que harás",
    steps: [
      { title: "Ingresa tu nombre", body: "Escribe tu nombre completo o mantén pulsado el botón del micrófono y dilo." },
      { title: "Usa el PIN de práctica", body: "Ingresa el número de cuatro dígitos indicado por el asistente. Un mensaje de práctica puede pedirte que lo intentes otra vez." },
      { title: "Completa la verificación del nombre", body: "Ingresa las dos letras solicitadas. Es solo una verificación de seguridad de práctica." },
      { title: "Elige una cantidad", body: "Selecciona, escribe o di cuánto dinero de práctica quieres retirar." },
      { title: "Confirma y termina", body: "Confirma la cantidad, revisa el saldo de práctica restante y completa el escenario." },
    ],
    waysToRespond: "Formas de responder",
    keypadTitle: "Botones del cajero",
    keypadBody: "Usa directamente los números, las letras, Enter, Borrar, Atrás y Cancelar del cajero.",
    voiceTitle: "Entrada de voz",
    voiceBody: "Mantén pulsado un botón de micrófono mientras hablas y suéltalo al terminar. También puedes mantener pulsada la tecla Espacio para activar el micrófono.",
    safetyTitle: "Solo información de práctica",
    safetyBody: "Nunca ingreses un PIN bancario, número de tarjeta, cuenta o saldo real.",
    reassurance: "Aquí es normal equivocarse. El asistente te explicará qué hacer después.",
    back: "Volver a escenarios",
    start: "Iniciar práctica del cajero",
    atmPreviewAlt: "Vista previa del cajero de práctica ASSIST-AI",
  },
  de: {
    eyebrow: "Bevor du beginnst",
    title: "So funktioniert die Geldautomaten-Übung",
    subtitle: "Schau dir in Ruhe an, was passieren wird. Es gibt kein Zeitlimit, und du kannst die Nachricht des Assistenten jederzeit wiederholen.",
    whatWillHappen: "Was du tun wirst",
    steps: [
      { title: "Namen eingeben", body: "Gib deinen vollständigen Namen ein oder halte die Mikrofontaste gedrückt und sprich ihn aus." },
      { title: "Übungs-PIN verwenden", body: "Gib die vierstellige Zahl ein, die der Assistent nennt. Eine Übungsmeldung kann dich auffordern, es erneut zu versuchen." },
      { title: "Namensprüfung abschließen", body: "Gib die zwei angeforderten Buchstaben ein. Dies ist nur eine Sicherheitsübung." },
      { title: "Betrag auswählen", body: "Wähle, tippe oder sage, wie viel Übungsgeld du abheben möchtest." },
      { title: "Bestätigen und abschließen", body: "Bestätige den Betrag, prüfe das verbleibende Übungsguthaben und beende das Szenario." },
    ],
    waysToRespond: "Antwortmöglichkeiten",
    keypadTitle: "Tasten des Geldautomaten",
    keypadBody: "Nutze Zahlen, Buchstaben, Enter, Löschen, Zurück und Abbrechen direkt am Geldautomaten.",
    voiceTitle: "Spracheingabe",
    voiceBody: "Halte eine Mikrofontaste beim Sprechen gedrückt und lasse sie los, wenn du fertig bist. Du kannst auch die Leertaste gedrückt halten, um das Mikrofon zu aktivieren.",
    safetyTitle: "Nur Übungsinformationen",
    safetyBody: "Gib niemals eine echte Bank-PIN, Karten-, Konto- oder Guthabennummer ein.",
    reassurance: "Fehler sind hier in Ordnung. Der Assistent erklärt dir den nächsten Schritt.",
    back: "Zurück zu den Szenarien",
    start: "Geldautomaten-Übung starten",
    atmPreviewAlt: "Vorschau des ASSIST-AI Übungs-Geldautomaten",
  },
  tr: {
    eyebrow: "Başlamadan önce",
    title: "ATM pratiği nasıl çalışır?",
    subtitle: "Neler olacağını sakince incele. Süre sınırı yoktur ve ihtiyaç duyduğunda asistanın mesajını tekrar dinleyebilirsin.",
    whatWillHappen: "Yapacağın adımlar",
    steps: [
      { title: "Adını gir", body: "Adını ve soyadını yaz veya mikrofon düğmesini basılı tutarak söyle." },
      { title: "Pratik PIN'ini kullan", body: "Asistanın söylediği dört haneli sayıyı gir. Pratik sistem mesajı yeniden denemeni isteyebilir." },
      { title: "Ad doğrulamasını tamamla", body: "İstenen iki harfi gir. Bu yalnızca pratik amaçlı bir güvenlik kontrolüdür." },
      { title: "Tutar seç", body: "Çekmek istediğin pratik para tutarını seç, yaz veya söyle." },
      { title: "Onayla ve tamamla", body: "Tutarı onayla, kalan pratik bakiyeni kontrol et ve senaryoyu tamamla." },
    ],
    waysToRespond: "Yanıt verme yolları",
    keypadTitle: "ATM düğmeleri",
    keypadBody: "ATM üzerindeki sayıları, harfleri, Enter, Temizle, Geri ve İptal düğmelerini kullan.",
    voiceTitle: "Sesli giriş",
    voiceBody: "Konuşurken mikrofon düğmesini basılı tut ve bitirdiğinde bırak. Mikrofonu etkinleştirmek için Boşluk tuşunu da basılı tutabilirsin.",
    safetyTitle: "Yalnızca pratik bilgileri",
    safetyBody: "Gerçek banka PIN'i, kart numarası, hesap numarası veya gerçek bakiye bilgisi girme.",
    reassurance: "Burada hata yapmak normaldir. Asistan bir sonraki adımı açıklayacaktır.",
    back: "Senaryolara dön",
    start: "ATM pratiğini başlat",
    atmPreviewAlt: "ASSIST-AI pratik ATM'sinin ön izlemesi",
  },
  pt: {
    eyebrow: "Antes de começar",
    title: "Como funciona a prática no caixa eletrônico",
    subtitle: "Veja com calma o que vai acontecer. Não há limite de tempo e pode repetir a mensagem do assistente sempre que precisar.",
    whatWillHappen: "O que vai fazer",
    steps: [
      { title: "Introduza o seu nome", body: "Escreva o nome completo ou mantenha o botão do microfone pressionado e diga-o." },
      { title: "Use o PIN de prática", body: "Introduza o número de quatro dígitos indicado pelo assistente. Uma mensagem de prática pode pedir uma nova tentativa." },
      { title: "Conclua a verificação do nome", body: "Introduza as duas letras pedidas. Esta é apenas uma verificação de segurança de prática." },
      { title: "Escolha um valor", body: "Selecione, escreva ou diga quanto dinheiro de prática pretende levantar." },
      { title: "Confirme e termine", body: "Confirme o valor, veja o saldo de prática restante e conclua o cenário." },
    ],
    waysToRespond: "Formas de responder",
    keypadTitle: "Botões do caixa eletrônico",
    keypadBody: "Use os números, letras, Enter, Limpar, Voltar e Cancelar diretamente no caixa eletrônico.",
    voiceTitle: "Entrada de voz",
    voiceBody: "Mantenha um botão de microfone pressionado enquanto fala e solte-o quando terminar. Também pode manter a tecla Espaço pressionada para ativar o microfone.",
    safetyTitle: "Apenas informações de prática",
    safetyBody: "Nunca introduza um PIN bancário, número de cartão, conta ou saldo real.",
    reassurance: "É normal cometer erros aqui. O assistente explicará o próximo passo.",
    back: "Voltar aos cenários",
    start: "Iniciar prática no caixa eletrônico",
    atmPreviewAlt: "Pré-visualização do caixa eletrônico de prática ASSIST-AI",
  },
  fr: {
    eyebrow: "Avant de commencer",
    title: "Comment fonctionne l'exercice au distributeur",
    subtitle: "Prends le temps de découvrir ce qui va se passer. Il n'y a pas de limite de temps et tu peux répéter le message de l'assistant quand tu en as besoin.",
    whatWillHappen: "Ce que tu vas faire",
    steps: [
      { title: "Saisis ton nom", body: "Écris ton nom complet ou maintiens le bouton du microphone et prononce-le." },
      { title: "Utilise le code PIN d'entraînement", body: "Saisis le nombre à quatre chiffres indiqué par l'assistant. Un message d'entraînement peut te demander de réessayer." },
      { title: "Effectue la vérification du nom", body: "Saisis les deux lettres demandées. Il s'agit uniquement d'une vérification de sécurité d'entraînement." },
      { title: "Choisis un montant", body: "Sélectionne, saisis ou prononce le montant d'entraînement que tu souhaites retirer." },
      { title: "Confirme et termine", body: "Confirme le montant, vérifie le solde d'entraînement restant et termine le scénario." },
    ],
    waysToRespond: "Façons de répondre",
    keypadTitle: "Touches du distributeur",
    keypadBody: "Utilise directement les chiffres, les lettres, Entrée, Effacer, Retour et Annuler du distributeur.",
    voiceTitle: "Saisie vocale",
    voiceBody: "Maintiens un bouton de microphone pendant que tu parles, puis relâche-le lorsque tu as terminé. Tu peux aussi maintenir la touche Espace pour activer le microphone.",
    safetyTitle: "Informations d'entraînement uniquement",
    safetyBody: "Ne saisis jamais de vrai code PIN bancaire, numéro de carte, de compte ou de solde réel.",
    reassurance: "Il est normal de faire des erreurs ici. L'assistant expliquera l'étape suivante.",
    back: "Retour aux scénarios",
    start: "Commencer l'exercice au distributeur",
    atmPreviewAlt: "Aperçu du distributeur d'entraînement ASSIST-AI",
  },
};
