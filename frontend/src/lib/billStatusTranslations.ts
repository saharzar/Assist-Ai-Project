import type { LanguageCode } from "../i18n";

export const billStatusTranslations: Record<LanguageCode, {
  welcome: (name: string) => string;
  paid: string;
  unpaid: string;
}> = {
  en: { welcome: (name) => `Welcome, ${name}`, paid: "Paid", unpaid: "Unpaid" },
  es: { welcome: (name) => `Bienvenido, ${name}`, paid: "Pagada", unpaid: "Pendiente" },
  de: { welcome: (name) => `Willkommen, ${name}`, paid: "Bezahlt", unpaid: "Unbezahlt" },
  tr: { welcome: (name) => `Hoş geldiniz, ${name}`, paid: "Ödendi", unpaid: "Ödenmedi" },
  pt: { welcome: (name) => `Bem-vindo, ${name}`, paid: "Paga", unpaid: "Por pagar" },
  fr: { welcome: (name) => `Bienvenue, ${name}`, paid: "Payée", unpaid: "Impayée" },
};
