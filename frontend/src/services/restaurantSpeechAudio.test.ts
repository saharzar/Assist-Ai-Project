import { afterEach, describe, expect, it, vi } from "vitest";
import { MOUTH_CONFIG, MouthEnvelope, pcmRms } from "./restaurantSpeechAudio";

describe("restaurant audio envelope", () => {
  it("measures normalized PCM RMS, including negative samples", () => {
    expect(pcmRms(new Float32Array([.5, -.5]))).toBe(.5);
  });
  it("maps silence, slight speech, normal speech and stronger speech to their mouth frames", () => {
    const meter = new MouthEnvelope();
    expect(meter.update(0, 33)).toBe("closed");
    for (let t = 66; t <= 297; t += 33) meter.update(.01, t);
    expect(meter.state).toBe("slight");
    for (let t = 330; t <= 594; t += 33) meter.update(.04, t);
    expect(meter.state).toBe("open");
    for (let t = 627; t <= 924; t += 33) meter.update(.2, t);
    expect(meter.state).toBe("wide");
    for (let t = 957; t <= 1089; t += 33) meter.update(0, t);
    expect(meter.state).toBe("closed");
    for (let t = 1122; t <= 1254; t += 33) meter.update(.04, t);
    expect(meter.state).toBe("open");
  });
  it("uses hysteresis and hold time to avoid rapid changes near thresholds", () => {
    const meter = new MouthEnvelope();
    for (let t = 33; t <= 330; t += 33) meter.update(.04, t);
    for (let t = 363; t < 1200; t += 33) {
      expect(["open", "rounded"]).toContain(meter.update(t % 2 ? .015 : .017, t));
    }
    let changes = 0, previous = meter.state === "rounded" ? "open" : meter.state;
    for (let t = 1200; t < 2200; t += 33) {
      const next = meter.update(t % 2 ? .04 : .2, t);
      if (next !== "rounded") {
        if (next !== previous) changes++;
        previous = next;
      }
    }
    expect(changes).toBeLessThanOrEqual(11);
  });
  it("uses the rounded frame briefly during speech, with a cooldown, and never during silence", () => {
    const meter = new MouthEnvelope();
    const roundedTimes: number[] = [];
    for (let t = 33; t <= 2508; t += 33) {
      if (meter.update(.04, t) === "rounded") roundedTimes.push(t);
    }
    expect(roundedTimes.length).toBeGreaterThan(0);
    expect(roundedTimes.length).toBeLessThan(15);
    expect(roundedTimes.filter((t) => t < 1000).length * MOUTH_CONFIG.intervalMs).toBeLessThanOrEqual(MOUTH_CONFIG.roundedHoldMs + MOUTH_CONFIG.intervalMs);
    const firstRounded = roundedTimes[0];
    expect(roundedTimes.some((t) => t > firstRounded + MOUTH_CONFIG.roundedHoldMs && t < firstRounded + MOUTH_CONFIG.roundedHoldMs + MOUTH_CONFIG.roundedCooldownMs)).toBe(false);
    for (let t = 2541; t <= 2673; t += 33) {
      expect(meter.update(0, t)).not.toBe("rounded");
    }
    expect(meter.state).toBe("closed");
  });
});

afterEach(() => vi.unstubAllGlobals());
it("reuses one silent analyser branch, closes on stop/unsubscribe, and restarts on repeat", async () => {
  vi.resetModules();
  const module = await import("./restaurantSpeechAudio");
  let tick: FrameRequestCallback | undefined;
  const cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => { tick = cb; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", cancel);
  let level = .04;
  const analyser = { fftSize: 1024, getFloatTimeDomainData: (data: Float32Array) => data.fill(level) };
  const connect = vi.fn();
  const createSource = vi.fn(() => ({ connect }));
  const resume = vi.fn(() => Promise.resolve());
  const constructor = vi.fn();
  const destination = {};
  vi.stubGlobal("window", { AudioContext: class {
    state = "running"; destination = destination;
    resume = resume; close = vi.fn();
    createAnalyser = () => analyser;
    createMediaElementSource = createSource;
    constructor() { constructor(); }
  } });
  const audio = { paused: false, ended: false } as HTMLAudioElement;
  const unsubscribe = module.subscribeRestaurantMouth(vi.fn());
  module.prepareRestaurantAudio(audio, true);
  module.startRestaurantAudioAnalysis(audio);
  tick!(33); tick!(66); tick!(99); tick!(132);
  expect(module.getRestaurantMouth()).toBe("open");
  level = 0;
  tick!(165); tick!(198); tick!(231); tick!(264);
  expect(module.getRestaurantMouth()).toBe("closed");
  module.stopRestaurantAudioAnalysis();
  expect(cancel).toHaveBeenCalled();
  module.prepareRestaurantAudio(audio, true);
  module.startRestaurantAudioAnalysis(audio);
  level = .2;
  for (let now = 300; now <= 630; now += 33) tick!(now);
  expect(module.getRestaurantMouth()).toBe("wide");
  expect(constructor).toHaveBeenCalledOnce();
  expect(createSource).toHaveBeenCalledOnce();
  expect(connect.mock.calls).toEqual([[destination], [analyser]]);
  unsubscribe();
  expect(module.getRestaurantMouth()).toBe("closed");
});
