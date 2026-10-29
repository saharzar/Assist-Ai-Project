import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ API_BASE_URL: "", ApiError: class extends Error {}, getSessionHeaders: () => ({}) }));
vi.mock("./ttsUsageService", () => ({ notifyTtsUsageUpdated: vi.fn() }));
vi.mock("./speechProviderService", () => ({ notifySpeechProviderUsed: vi.fn() }));

let service: typeof import("./speechSynthesisService");
let surface: EventTarget;
let browserSpeak: ReturnType<typeof vi.fn>;
let mediaPlay: ReturnType<typeof vi.fn<() => Promise<void>>>;
let fetchMock: ReturnType<typeof vi.fn>;
let audios: TestAudio[];
class TestAudio {
  src = ""; preload = ""; currentTime = 0; volume = 1;
  onplay: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pause = vi.fn(); load = vi.fn(); removeAttribute = vi.fn();
  play = vi.fn(() => mediaPlay().then(() => { this.onplay?.(); this.onplaying?.(); }));
  constructor() { audios.push(this); }
}
const audioResponse = () => new Response(new Blob(["audio"], { type: "audio/mpeg" }),
  { status: 200, headers: { "X-Speech-Provider": "soniox" } });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); audios = [];
  mediaPlay = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  browserSpeak = vi.fn();
  surface = new EventTarget();
  vi.stubGlobal("window", Object.assign(surface, { speechSynthesis: { cancel: vi.fn(), getVoices: () => [], speak: browserSpeak } }));
  vi.stubGlobal("localStorage", { getItem: (key: string) => key === "assist_ai_token" ? "test-login" : null });
  vi.stubGlobal("Audio", TestAudio);
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.stubGlobal("crypto", { randomUUID: () => "test-request" });
  fetchMock = vi.fn().mockImplementation(async () => audioResponse());
  vi.stubGlobal("fetch", fetchMock);
  service = await import("./speechSynthesisService");
});
afterEach(async () => { service?.stopAssistantSpeech(); await flush(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Soniox voice after refresh", () => {
  it("analyses the one existing player and closes on end, stop, error and repeat", async () => {
    let tick: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { tick = cb; return 1; });
    const cancelFrame = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    const createSource = vi.fn(() => ({ connect: vi.fn() }));
    Object.assign(surface, { AudioContext: class {
      state = "running"; destination = {};
      resume = () => Promise.resolve();
      createAnalyser = () => ({ fftSize: 1024, getFloatTimeDomainData: (data: Float32Array) => data.fill(.2) });
      createMediaElementSource = createSource;
    } });
    const mouth = await import("./restaurantSpeechAudio");
    for (const action of ["end", "stop", "error"] as const) {
      service.speakAssistantMessage("One restaurant message", { scenario: "restaurant" });
      await flush();
      for (let now = 33; now <= 330; now += 33) tick!(now);
      expect(mouth.getRestaurantMouth()).toBe("wide");
      if (action === "end") audios[0].onended?.();
      else if (action === "error") audios[0].onerror?.();
      else service.stopAssistantSpeech();
      expect(mouth.getRestaurantMouth()).toBe("closed");
    }
    expect(createSource).toHaveBeenCalledOnce();
    expect(audios).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mediaPlay).toHaveBeenCalledTimes(3);
    expect(cancelFrame).toHaveBeenCalled();
  });

  it("waits for activation if Web Audio is suspended without switching voices", async () => {
    let tick: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { tick = cb; return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    let activated = false;
    Object.assign(surface, { AudioContext: class {
      state = "suspended"; destination = {};
      resume = () => { if (activated) this.state = "running"; return Promise.resolve(); };
      createAnalyser = () => ({ fftSize: 1024, getFloatTimeDomainData: (data: Float32Array) => data.fill(.2) });
      createMediaElementSource = () => ({ connect: vi.fn() });
    } });
    service.speakAssistantMessage("Activation", { scenario: "restaurant" });
    await flush();
    expect(audios[0].pause).toHaveBeenCalled();
    expect(browserSpeak).not.toHaveBeenCalled();
    activated = true;
    surface.dispatchEvent(new Event("click"));
    await flush();
    for (let now = 33; now <= 330; now += 33) tick!(now);
    expect((await import("./restaurantSpeechAudio")).getRestaurantMouth()).toBe("wide");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(audios).toHaveLength(1);
  });
  it.each(["en", "es", "de", "tr", "pt", "fr"] as const)("scopes restaurant audio and cache independently in %s", async (language) => {
    service.speakAssistantMessage("Same text", { scenario: "restaurant" }, language);
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ text: "Same text", language, scenario: "restaurant" });
    service.stopAssistantSpeech();
    service.speakAssistantMessage("Same text", { scenario: "restaurant" }, language);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(audios).toHaveLength(1);
    service.speakAssistantMessage("Same text", {}, language);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ text: "Same text", language });
  });
  it("reuses identical final waiter audio and separates changed text and language", async () => {
    service.speakAssistantMessage("What would you like to change?", { scenario: "restaurant" }, "en");
    await flush();
    service.stopAssistantSpeech();
    service.speakAssistantMessage("What would you like to change?", { scenario: "restaurant" }, "en");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    service.stopAssistantSpeech();
    service.speakAssistantMessage("What would you like to add?", { scenario: "restaurant" }, "en");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    service.stopAssistantSpeech();
    service.speakAssistantMessage("What would you like to change?", { scenario: "restaurant" }, "fr");
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("plays Soniox normally when autoplay is permitted", async () => {
    const onStart = vi.fn();
    service.speakAssistantMessage("Hello", { onStart });
    await flush();
    expect(mediaPlay).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledOnce();
    expect(browserSpeak).not.toHaveBeenCalled();
  });

  it.each(["click", "keydown"])("keeps Soniox when autoplay is blocked and resumes its existing audio on %s", async (event) => {
    mediaPlay.mockRejectedValueOnce(new DOMException("User activation required", "NotAllowedError"));
    const onStart = vi.fn(); const onError = vi.fn();
    service.speakAssistantMessage("Hello", { onStart, onError, allowBrowserFallback: true });
    await flush();
    expect(onStart).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(browserSpeak).not.toHaveBeenCalled();
    surface.dispatchEvent(new Event(event));
    await flush();
    expect(mediaPlay).toHaveBeenCalledTimes(2);
    expect(audios).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledOnce();
    surface.dispatchEvent(new Event(event));
    expect(mediaPlay).toHaveBeenCalledTimes(2);
    expect(browserSpeak).not.toHaveBeenCalled();
  });

  it("can retry another gesture if the browser still blocks playback", async () => {
    mediaPlay.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"))
      .mockRejectedValueOnce(new DOMException("Still blocked", "NotAllowedError"));
    service.speakAssistantMessage("Hello"); await flush();
    surface.dispatchEvent(new Event("click")); await flush();
    expect(browserSpeak).not.toHaveBeenCalled();
    surface.dispatchEvent(new Event("keydown")); await flush();
    expect(mediaPlay).toHaveBeenCalledTimes(3);
    expect(browserSpeak).not.toHaveBeenCalled();
  });

  it("removes gesture listeners on stop and never plays a cancelled message", async () => {
    mediaPlay.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    const remove = vi.spyOn(surface, "removeEventListener");
    const onStart = vi.fn();
    service.speakAssistantMessage("Hello", { onStart }); await flush();
    service.stopAssistantSpeech(); await flush();
    expect(remove).toHaveBeenCalledWith("click", expect.any(Function), true);
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function), true);
    surface.dispatchEvent(new Event("click")); await flush();
    expect(mediaPlay).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
    expect(browserSpeak).not.toHaveBeenCalled();
  });

  it("replaces blocked speech cleanly on repeat or navigation", async () => {
    mediaPlay.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    const oldStart = vi.fn(); const newStart = vi.fn();
    service.speakAssistantMessage("Old message", { onStart: oldStart }); await flush();
    service.speakAssistantMessage("New message", { onStart: newStart }); await flush();
    surface.dispatchEvent(new Event("click")); await flush();
    expect(oldStart).not.toHaveBeenCalled();
    expect(newStart).toHaveBeenCalledOnce();
    expect(mediaPlay).toHaveBeenCalledTimes(2);
    expect(browserSpeak).not.toHaveBeenCalled();
  });

  it("retries a shared request cancelled by a previous mount without switching voices", async () => {
    fetchMock.mockImplementationOnce((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")));
    }));
    service.speakAssistantMessage("Hello"); await flush();
    service.stopAssistantSpeech();
    const onStart = vi.fn();
    service.speakAssistantMessage("Hello", { onStart }); await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onStart).toHaveBeenCalledOnce();
    expect(browserSpeak).not.toHaveBeenCalled();
  });

  it("preserves browser fallback for an actual backend failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"detail":"Voice unavailable"}', { status: 503 }));
    service.speakAssistantMessage("Hello", { allowBrowserFallback: true }); await flush();
    expect(browserSpeak).toHaveBeenCalledOnce();
  });

  it("preserves explicitly configured browser voice", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204, headers: { "X-Speech-Provider": "browser" } }));
    service.speakAssistantMessage("Hello", { allowBrowserFallback: true }); await flush();
    expect(browserSpeak).toHaveBeenCalledOnce();
    expect(mediaPlay).not.toHaveBeenCalled();
  });
  it("retries Soniox for the same message after backend fallback recovers", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204, headers: { "X-Speech-Provider": "browser" } }));
    service.speakAssistantMessage("Hello", { allowBrowserFallback: true }); await flush();
    expect(browserSpeak).toHaveBeenCalledOnce();
    const onStart = vi.fn();
    service.speakAssistantMessage("Hello", { onStart, allowBrowserFallback: true }); await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mediaPlay).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledOnce();
    expect(browserSpeak).toHaveBeenCalledOnce();
  });
});
