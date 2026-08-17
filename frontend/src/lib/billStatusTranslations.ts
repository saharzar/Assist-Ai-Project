import type { LanguageCode } from "../i18n";

export const billStatusTranslations: Record<LanguageCode, {
  welcome: (name: string) => string;
  paid: string;
  unpaid: string;
  leave: string;
}> = {
  en: { welcome: (name) => `Welcome, ${name}`, paid: "Paid", unpaid: "Unpaid", leave: "Leave bill payment" },
  es: { welcome: (name) => `Bienvenido, ${name}`, paid: "Pagada", unpaid: "Pendiente", leave: "Salir del pago de facturas" },
  de: { welcome: (name) => `Willkommen, ${name}`, paid: "Bezahlt", unpaid: "Unbezahlt", leave: "Rechnungszahlung verlassen" },
  tr: { welcome: (name) => `Hoş geldiniz, ${name}`, paid: "Ödendi", unpaid: "Ödenmedi", leave: "Fatura ödemeden ayrıl" },
  pt: { welcome: (name) => `Bem-vindo, ${name}`, paid: "Paga", unpaid: "Por pagar", leave: "Sair do pagamento de faturas" },
  fr: { welcome: (name) => `Bienvenue, ${name}`, paid: "Payée", unpaid: "Impayée", leave: "Quitter le paiement de factures" },
};
