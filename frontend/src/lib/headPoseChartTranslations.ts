import type { LanguageCode } from "../i18n";

type ChartText = { title: string; time: string; angle: string; interaction: string; empty: string; gaps: string };
export const headPoseChartTranslations: Record<LanguageCode, ChartText> = {
  en: { title: "Head pose over time", time: "Session time (s)", angle: "Angle (°)", interaction: "Amber bands: interaction samples", empty: "No saved head-pose data to display.", gaps: "Gaps indicate unavailable tracking or more than 1.5 seconds between samples." },
  es: { title: "Posición de la cabeza a lo largo del tiempo", time: "Tiempo de sesión (s)", angle: "Ángulo (°)", interaction: "Bandas ámbar: muestras de interacción", empty: "No hay datos guardados de la cabeza para mostrar.", gaps: "Los espacios indican seguimiento no disponible o más de 1,5 segundos entre muestras." },
  de: { title: "Kopfhaltung im Zeitverlauf", time: "Sitzungszeit (s)", angle: "Winkel (°)", interaction: "Gelbe Bereiche: Interaktionsmesswerte", empty: "Keine gespeicherten Kopfmesswerte vorhanden.", gaps: "Lücken zeigen fehlende Erfassung oder mehr als 1,5 Sekunden zwischen Messwerten." },
  tr: { title: "Zamana göre baş yönü", time: "Oturum süresi (s)", angle: "Açı (°)", interaction: "Sarı alanlar: etkileşim örnekleri", empty: "Görüntülenecek kayıtlı baş verisi yok.", gaps: "Boşluklar, izleme verisinin eksik olduğunu veya örnekler arasında 1,5 saniyeden fazla süre geçtiğini gösterir." },
  pt: { title: "Posição da cabeça ao longo do tempo", time: "Tempo da sessão (s)", angle: "Ângulo (°)", interaction: "Faixas amarelas: amostras de interação", empty: "Não há dados salvos da cabeça para exibir.", gaps: "Lacunas indicam rastreamento indisponível ou mais de 1,5 segundos entre amostras." },
  fr: { title: "Orientation de la tête au fil du temps", time: "Temps de session (s)", angle: "Angle (°)", interaction: "Bandes jaunes : échantillons d’interaction", empty: "Aucune donnée de tête enregistrée à afficher.", gaps: "Les espaces indiquent un suivi indisponible ou plus de 1,5 seconde entre les échantillons." },
};
