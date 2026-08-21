const internationalNamePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const internationalUsernamePattern = /^[\p{L}\p{M}\p{N}._-]{3,24}$/u;

export function sanitizeBillAccountName(value: string) {
  return value.replace(/[^\p{L}\p{M} '\u2019-]/gu, "");
}

export function sanitizeBillAccountUsername(value: string) {
  return value.replace(/[^\p{L}\p{M}\p{N}._-]/gu, "");
}

export function isValidBillAccountName(value: string) {
  return internationalNamePattern.test(value.trim());
}

export function isValidBillAccountUsername(value: string) {
  return internationalUsernamePattern.test(value);
}
