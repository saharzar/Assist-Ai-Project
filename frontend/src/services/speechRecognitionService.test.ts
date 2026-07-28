import { describe, expect, it } from "vitest";

import {
  cleanSpokenLetterTranscript,
  parseSpokenConfirmation,
} from "./speechRecognitionService";

describe("cleanSpokenLetterTranscript", () => {
  it.each([
    ["A R", "AR"],
    ["a and r", "ar"],
    ["ay are", "ar"],
    ["Ö R", "ÖR"],
  ])("extracts exactly two letters from %s", (transcript, expected) => {
    expect(cleanSpokenLetterTranscript(transcript)).toBe(expected);
  });

  it("does not guess when more than two letters are spoken", () => {
    expect(cleanSpokenLetterTranscript("A B C")).toBe("");
  });
});

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
