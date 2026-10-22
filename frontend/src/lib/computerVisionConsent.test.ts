import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearComputerVisionConsent, COMPUTER_VISION_CONSENT_STORAGE_KEY, readComputerVisionConsent, saveComputerVisionConsent } from "./computerVisionConsent";

describe("login-session computer vision consent", () => {
  let token: string | null;
  let stored: Map<string, string>;
  beforeEach(() => {
    token = "login-one";
    stored = new Map();
    vi.stubGlobal("localStorage", { getItem: () => token });
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
      key: (index: number) => [...stored.keys()][index],
      get length() { return stored.size; },
    });
    clearComputerVisionConsent();
  });
  afterEach(() => { clearComputerVisionConsent(); vi.unstubAllGlobals(); });

  it("starts without either choice preselected and ignores legacy scenario choices", () => {
    stored.set("assist_ai_computer_vision_consent:atm-withdrawal", "allowed");
    expect(readComputerVisionConsent("atm-withdrawal")).toBeNull();
    expect(readComputerVisionConsent("online-bill-payment")).toBeNull();
  });

  it.each([true, false])("shares %s across scenarios and restores it on refresh in the same login", async (allowed) => {
    saveComputerVisionConsent(allowed, token!);
    expect(readComputerVisionConsent("atm-withdrawal")).toBe(allowed);
    expect(readComputerVisionConsent("online-bill-payment")).toBe(allowed);
    vi.resetModules();
    const restored = await import("./computerVisionConsent");
    expect(restored.readComputerVisionConsent()).toBe(allowed);
    token = "new-login";
    expect(restored.readComputerVisionConsent()).toBeNull();
  });

  it("does not reuse consent after token replacement or logout", () => {
    saveComputerVisionConsent(true, token!);
    token = "login-two";
    expect(readComputerVisionConsent()).toBeNull();
    token = null;
    expect(readComputerVisionConsent()).toBeNull();
  });

  it("clears both session and legacy choices without clearing unrelated scenario setup", () => {
    saveComputerVisionConsent(true, token!);
    stored.set("assist_ai_computer_vision_consent:atm-withdrawal", "allowed");
    stored.set("assist_ai_computer_vision_consent:online-bill-payment", "denied");
    stored.set("assist_ai_atm_name", "Test User");
    clearComputerVisionConsent();
    expect([...stored.keys()]).toEqual(["assist_ai_atm_name"]);
    expect(readComputerVisionConsent()).toBeNull();
  });

  it.each(["not json", "null", '{"token":"login-one","allowed":"yes"}'])("ignores invalid stored consent: %s", (value) => {
    stored.set(COMPUTER_VISION_CONSENT_STORAGE_KEY, value);
    expect(readComputerVisionConsent()).toBeNull();
  });

  it("keeps an explicit choice in memory if session storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("Unavailable"); },
      setItem: () => { throw new Error("Unavailable"); }, removeItem: () => { throw new Error("Unavailable"); } });
    expect(readComputerVisionConsent()).toBeNull();
    saveComputerVisionConsent(false, token!);
    expect(readComputerVisionConsent()).toBe(false);
    clearComputerVisionConsent();
    expect(readComputerVisionConsent()).toBeNull();
  });
});
