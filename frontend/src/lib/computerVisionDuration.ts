import type { LanguageCode } from "../i18n";
import { adminAnalyticsTranslations } from "./adminAnalyticsTranslations";
import { adminComputerVisionTranslations } from "./adminComputerVisionTranslations";

/** Display saved milliseconds as whole hours, minutes and seconds. */
export function formatComputerVisionDuration(milliseconds: number, language: LanguageCode): string {
  const text = adminComputerVisionTranslations[language];
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const units = [
    [Math.floor(totalSeconds / 3600), text.hour],
    [Math.floor(totalSeconds / 60) % 60, text.minute],
    [totalSeconds % 60, text.second],
  ] as const;
  return units.filter(([value, label]) => value > 0 || (totalSeconds === 0 && label === text.second))
    .map(([value, label]) => `${value.toLocaleString(adminAnalyticsTranslations[language].locale)} ${label}`).join(" ");
}
