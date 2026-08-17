export type PracticeCardDetails = {
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
};

function calculateLuhnCheckDigit(firstFifteenDigits: string) {
  const sum = firstFifteenDigits
    .split("")
    .map(Number)
    .reduce((total, digit, index) => {
      const doubled = index % 2 === 0 ? digit * 2 : digit;
      return total + (doubled > 9 ? doubled - 9 : doubled);
    }, 0);
  return String((10 - (sum % 10)) % 10);
}

export function isLuhnValid(cardNumber: string) {
  if (!/^\d{16}$/.test(cardNumber)) return false;
  const digits = cardNumber.split("").map(Number);
  const sum = digits.reduce((total, digit, index) => {
    const doubled = index % 2 === 0 ? digit * 2 : digit;
    return total + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);
  return sum % 10 === 0;
}

export function createPracticeCardDetails(
  cardholderName: string,
  now = new Date(),
  random: () => number = Math.random,
): PracticeCardDetails {
  const nextDigit = () => Math.floor(Math.min(Math.max(random(), 0), 0.999999999) * 10);
  const firstFifteenDigits = `5${Array.from({ length: 14 }, nextDigit).join("")}`;
  const cardNumber = `${firstFifteenDigits}${calculateLuhnCheckDigit(firstFifteenDigits)}`;
  const monthsAhead = 12 + Math.floor(Math.min(Math.max(random(), 0), 0.999999999) * 36);
  const expiryDate = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  const expiry = `${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${String(expiryDate.getFullYear()).slice(-2)}`;
  const cvv = String(100 + Math.floor(Math.min(Math.max(random(), 0), 0.999999999) * 900));

  return { cardNumber, expiry, cvv, cardholderName: cardholderName.trim().toUpperCase() };
}

export function matchesPracticeCard(entered: PracticeCardDetails, expected: PracticeCardDetails) {
  return entered.cardNumber === expected.cardNumber
    && entered.expiry === expected.expiry
    && entered.cvv === expected.cvv
    && entered.cardholderName.trim().toUpperCase() === expected.cardholderName;
}
