import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { fetchCurrentUser, loginUser, type User } from "../services/authService";
import { clearComputerVisionConsent, readComputerVisionConsent, saveComputerVisionConsent } from "../lib/computerVisionConsent";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, effects: [] as Array<() => void | (() => void)> }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }];
  },
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
  useMemo: (factory: () => unknown) => factory(),
}));
vi.mock("../services/authService", () => ({ fetchCurrentUser: vi.fn(), loginUser: vi.fn(), registerUser: vi.fn(), updatePreferredLanguage: vi.fn() }));

const user = { id: 1, full_name: "Test User", preferred_language: "en", role: "user" } as User;
let auth: ReturnType<typeof useAuth>;
function Probe() { auth = useAuth(); return null; }
function render() {
  hooks.cursor = 0; hooks.effects = [];
  renderToStaticMarkup(<AuthProvider><Probe /></AuthProvider>);
  return auth;
}
function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } };
}

beforeEach(() => {
  vi.clearAllMocks(); hooks.values = []; hooks.cursor = 0; hooks.effects = [];
  vi.stubGlobal("localStorage", storage()); vi.stubGlobal("sessionStorage", storage());
  vi.stubGlobal("window", new EventTarget());
  clearComputerVisionConsent();
  vi.mocked(loginUser).mockResolvedValue({ access_token: "login-token", token_type: "bearer", user });
  vi.mocked(fetchCurrentUser).mockResolvedValue(user);
});
afterEach(() => { clearComputerVisionConsent(); vi.unstubAllGlobals(); });

describe("authentication consent lifecycle", () => {
  it.each([true, false])("clears choice %s on logout and requires a new choice even if login returns the same token", async (allowed) => {
    await render().login({ email: "test@example.com", password: "test" });
    expect(render().computerVisionConsent).toBeNull();
    auth.chooseComputerVisionConsent(allowed);
    expect(render().computerVisionConsent).toBe(allowed);
    expect(readComputerVisionConsent()).toBe(allowed);
    auth.logout();
    expect(render().computerVisionConsent).toBeNull();
    expect(sessionStorage.length).toBe(0);
    await auth.login({ email: "test@example.com", password: "test" });
    expect(render().computerVisionConsent).toBeNull();
    expect(readComputerVisionConsent()).toBeNull();
  });

  it("restores consent for the same login, but requires consent when a different login token was restored", () => {
    localStorage.setItem("assist_ai_token", "old-token");
    localStorage.setItem("assist_ai_user", JSON.stringify(user));
    saveComputerVisionConsent(true, "old-token");
    expect(render().computerVisionConsent).toBe(true);
    hooks.values = [];
    localStorage.setItem("assist_ai_token", "new-token");
    expect(render().computerVisionConsent).toBeNull();
  });

  it("clears consent when restored authentication is rejected", async () => {
    localStorage.setItem("assist_ai_token", "old-token");
    localStorage.setItem("assist_ai_user", JSON.stringify(user));
    saveComputerVisionConsent(true, "old-token");
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error("Expired"));
    render(); hooks.effects[0]();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(render().computerVisionConsent).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });

  it("clears consent on logout or a different login in another tab and removes its listener", () => {
    localStorage.setItem("assist_ai_token", "old-token");
    localStorage.setItem("assist_ai_user", JSON.stringify(user));
    saveComputerVisionConsent(true, "old-token");
    render();
    const remove = vi.spyOn(window, "removeEventListener");
    const cleanup = hooks.effects[1]();
    localStorage.setItem("assist_ai_token", "new-token");
    window.dispatchEvent(Object.assign(new Event("storage"), { key: "assist_ai_token", storageArea: localStorage }));
    expect(render().computerVisionConsent).toBeNull();
    expect(auth.token).toBe("new-token");
    expect(sessionStorage.length).toBe(0);
    if (cleanup) cleanup();
    expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
  });

  it("does not allow a late authentication failure to clear a newer login's consent", async () => {
    localStorage.setItem("assist_ai_token", "old-token");
    let reject!: (error: Error) => void;
    vi.mocked(fetchCurrentUser).mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    render();
    const cleanup = hooks.effects[0]();
    if (cleanup) cleanup();
    await auth.login({ email: "test@example.com", password: "test" });
    render().chooseComputerVisionConsent(true);
    reject(new Error("Old request expired"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(render().computerVisionConsent).toBe(true);
    expect(readComputerVisionConsent()).toBe(true);
  });
});
