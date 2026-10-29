import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cleanSpokenAmountTranscript,
  cleanSpokenLetterTranscript,
  parseSpokenConfirmation,
  createSpeechRecognizer,
} from "./speechRecognitionService";

afterEach(() => vi.unstubAllGlobals());

describe("Restaurant browser STT fallback", () => {
  it("never promotes an interim result to a final utterance on release", () => {
    const instances: BrowserRecognizer[] = [];
    class BrowserRecognizer {
      lang = ""; continuous = false; interimResults = false;
      onstart: (() => void) | null = null;
      onresult: ((event: { results: unknown[] }) => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() { instances.push(this); }
      start() { this.onstart?.(); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    vi.stubGlobal("window", { SpeechRecognition: BrowserRecognizer, dispatchEvent: vi.fn() });
    vi.stubGlobal("navigator", { mediaDevices: undefined });
    const onResult = vi.fn();
    const callbacks = { onResult, onError: vi.fn(), onEnd: vi.fn(), onPartialResult: vi.fn() };
    const first = createSpeechRecognizer(callbacks, "restaurant", "fr")!;
    first.start();
    instances[0].onresult?.({ results: [{ 0: { transcript: "Je veux" }, length: 1, isFinal: false }] });
    first.stop();
    expect(onResult).not.toHaveBeenCalled();
    const second = createSpeechRecognizer(callbacks, "restaurant", "fr")!;
    second.start();
    instances[1].onresult?.({ results: [{ 0: { transcript: "Je veux voir les soupes" }, length: 1, isFinal: true }] });
    second.stop();
    expect(onResult).toHaveBeenCalledExactlyOnceWith("Je veux voir les soupes");
    expect(instances[1].lang).toBe("fr-FR");
  });
});

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

describe("cleanSpokenAmountTranscript", () => {
  it.each([
    ["500", "500"],
    ["five hundred", "500"],
    ["quinientos", "500"],
    ["fünfhundert", "500"],
    ["beş yüz", "500"],
    ["quinhentos", "500"],
    ["cinq cents", "500"],
    ["seven hundred fifty", "750"],
  ])("recognizes the spoken amount %s", (transcript, expected) => {
    expect(cleanSpokenAmountTranscript(transcript)).toBe(expected);
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
