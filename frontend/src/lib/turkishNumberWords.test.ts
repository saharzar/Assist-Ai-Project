import { describe, expect, it } from "vitest";

import { formatTurkishNumberWords } from "./turkishNumberWords";

describe("formatTurkishNumberWords", () => {
  it.each([
    [0, "sıfır"],
    [100, "yüz"],
    [750, "yedi yüz elli"],
    [1000, "bin"],
    [2300, "iki bin üç yüz"],
    [10_000, "on bin"],
  ])("formats %i naturally for Turkish speech", (amount, expected) => {
    expect(formatTurkishNumberWords(amount)).toBe(expected);
  });
});
