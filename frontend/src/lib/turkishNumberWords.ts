const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];

function underOneThousand(value: number) {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;
  const words: string[] = [];

  if (hundreds > 0) {
    if (hundreds > 1) words.push(ONES[hundreds]);
    words.push("yüz");
  }
  if (tens > 0) words.push(TENS[tens]);
  if (ones > 0) words.push(ONES[ones]);
  return words.join(" ");
}

/** Converts the whole-number ATM amounts used by Turkish speech into natural words. */
export function formatTurkishNumberWords(amount: number) {
  const value = Math.max(0, Math.floor(amount));
  if (value === 0) return "sıfır";

  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const remainder = value % 1_000;
  const words: string[] = [];

  if (millions > 0) words.push(underOneThousand(millions), "milyon");
  if (thousands > 0) {
    if (thousands > 1) words.push(underOneThousand(thousands));
    words.push("bin");
  }
  if (remainder > 0) words.push(underOneThousand(remainder));
  return words.join(" ");
}
