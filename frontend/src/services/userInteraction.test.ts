import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUserInteractionTracker } from "./userInteraction";

function move(surface: EventTarget, x: number, y = 100) {
  surface.dispatchEvent(Object.assign(new Event("mousemove"), { clientX: x, clientY: y }));
}

describe("recent keyboard and mouse interaction", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("counts keyboard activity and expires 1500 ms after the most recent event", () => {
    const surface = new EventTarget();
    const tracker = createUserInteractionTracker({ target: surface });
    tracker.start();
    expect(tracker.isUserInteracting()).toBe(false);
    surface.dispatchEvent(new Event("keydown"));
    expect(tracker.isUserInteracting()).toBe(true);
    vi.advanceTimersByTime(1000);
    surface.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(1499);
    expect(tracker.isUserInteracting()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(tracker.isUserInteracting()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    tracker.stop();
  });

  it("counts mouse clicks", () => {
    const surface = new EventTarget();
    const tracker = createUserInteractionTracker({ target: surface });
    tracker.start();
    surface.dispatchEvent(new Event("mousedown"));
    expect(tracker.isUserInteracting()).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(tracker.isUserInteracting()).toBe(false);
    tracker.stop();
  });

  it("counts meaningful movement but does not extend activity for tiny pointer jitter", () => {
    const surface = new EventTarget();
    const tracker = createUserInteractionTracker({ target: surface });
    tracker.start();
    move(surface, 100);
    move(surface, 103);
    expect(tracker.isUserInteracting()).toBe(false);
    move(surface, 108);
    expect(tracker.isUserInteracting()).toBe(true);
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(300);
      move(surface, i % 2 ? 106 : 110);
    }
    expect(tracker.isUserInteracting()).toBe(false);
    move(surface, 116);
    expect(tracker.isUserInteracting()).toBe(true);
    tracker.stop();
  });

  it("removes all listeners with matching capture settings and handles repeated start/stop safely", () => {
    const surface = new EventTarget();
    const add = vi.spyOn(surface, "addEventListener");
    const remove = vi.spyOn(surface, "removeEventListener");
    const tracker = createUserInteractionTracker({ target: surface });
    tracker.start();
    tracker.start();
    expect(add).toHaveBeenCalledTimes(3);
    tracker.stop();
    tracker.stop();
    expect(remove.mock.calls).toEqual(add.mock.calls);
    surface.dispatchEvent(new Event("keydown"));
    surface.dispatchEvent(new Event("mousedown"));
    move(surface, 100);
    move(surface, 200);
    expect(tracker.isUserInteracting()).toBe(false);
  });

  it("resets both the deadline and mouse anchor between sessions", () => {
    const surface = new EventTarget();
    const tracker = createUserInteractionTracker({ target: surface });
    tracker.start();
    move(surface, 100);
    move(surface, 200);
    expect(tracker.isUserInteracting()).toBe(true);
    tracker.stop();
    tracker.start();
    expect(tracker.isUserInteracting()).toBe(false);
    move(surface, 400);
    expect(tracker.isUserInteracting()).toBe(false);
    tracker.stop();
  });

  it("supports a configured timeout and movement threshold", () => {
    const surface = new EventTarget();
    const tracker = createUserInteractionTracker({ target: surface, timeoutMs: 2000, movementThresholdPx: 20 });
    tracker.start();
    move(surface, 100);
    move(surface, 110);
    expect(tracker.isUserInteracting()).toBe(false);
    move(surface, 120);
    vi.advanceTimersByTime(1500);
    expect(tracker.isUserInteracting()).toBe(true);
    vi.advanceTimersByTime(500);
    expect(tracker.isUserInteracting()).toBe(false);
    tracker.stop();
  });
});
