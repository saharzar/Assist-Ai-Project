import { describe, expect, it } from "vitest";

import { parseSpokenConfirmation } from "./speechRecognitionService";

describe("parseSpokenConfirmation", () => {
  it.each([
    ["en", "yes, I confirm", "confirm"],
    ["es", "sí, confirmo", "confirm"],
    ["de", "ja, das stimmt", "confirm"],
    ["tr", "evet, onaylıyorum", "confirm"],
    ["pt", "sim, confirmo", "confirm"],
    ["fr", "oui, je confirme", "confirm"],
    ["en", "no, I don't confirm", "reject"],
    ["es", "no confirmo", "reject"],
    ["de", "nein, das stimmt nicht", "reject"],
    ["tr", "hayır, onaylamıyorum", "reject"],
    ["pt", "não confirmo", "reject"],
    ["fr", "non, je ne confirme pas", "reject"],
  ] as const)("recognizes %s confirmation phrase %s", (language, phrase, expected) => {
    expect(parseSpokenConfirmation(phrase, language)).toBe(expected);
  });

  it("does not guess when the answer is unclear", () => {
    expect(parseSpokenConfirmation("maybe later", "en")).toBeNull();
  });
});
