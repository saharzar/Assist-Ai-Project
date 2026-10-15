import { describe, expect, it, vi } from "vitest";
import { createAtmSetupAnalytics } from "./atmSetupAnalytics";

describe("ATM setup analytics handoff", () => {
  it("saves an abandoned setup exactly once even while start is pending", async () => {
    let resolve!: (id: string) => void;
    const start = vi.fn(() => new Promise<string>((done) => { resolve = done; }));
    const abandon = vi.fn().mockResolvedValue(undefined);
    const owner = createAtmSetupAnalytics(start, abandon);
    const pending = owner.start(); owner.finish(); owner.finish();
    resolve("setup-id"); await pending; await Promise.resolve();
    expect(start).toHaveBeenCalledOnce(); expect(abandon).toHaveBeenCalledExactlyOnceWith("setup-id");
  });
  it("keeps one attempt across setup and practice and leaves practice cleanup in charge", async () => {
    const start = vi.fn().mockResolvedValue("setup-id"); const abandon = vi.fn();
    const owner = createAtmSetupAnalytics(start, abandon);
    await owner.start(); expect(await owner.claim()).toBe("setup-id"); owner.finish();
    expect(start).toHaveBeenCalledOnce(); expect(abandon).not.toHaveBeenCalled();
    expect(await owner.getSessionId()).toBe("setup-id");
  });
  it("does not create a phantom attempt on immediate cleanup or break when saving fails", async () => {
    const start = vi.fn().mockRejectedValue(new Error("Offline")); const abandon = vi.fn();
    const owner = createAtmSetupAnalytics(start, abandon); owner.finish();
    expect(start).not.toHaveBeenCalled(); expect(await owner.start()).toBeNull(); owner.finish();
    await Promise.resolve(); expect(abandon).not.toHaveBeenCalled();
  });
});
