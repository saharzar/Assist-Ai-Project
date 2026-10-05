import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFaceTrackingPreview } from "./AdminFaceTrackingPreview";
import { adminFaceTrackingPreviewTranslations } from "../lib/adminFaceTrackingPreviewTranslations";
import { authorizeAdminPreview, createAdminFaceTrackingPreview } from "../services/adminFaceTrackingPreview";

const state = vi.hoisted(() => ({ role: "admin", authenticated: true, loading: false, allowed: true,
  values: [] as unknown[], index: 0, setters: [] as ReturnType<typeof vi.fn>[],
  effects: [] as Array<() => void | (() => void)>, canvas: {} }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: () => { const index = state.index++; const setter = vi.fn(); state.setters[index] = setter; return [state.values[index], setter]; },
  useRef: () => ({ current: state.canvas }),
  useEffect: (setup: () => void | (() => void)) => { state.effects.push(setup); },
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: state.authenticated, isLoading: state.loading, user: { role: state.role }, token: "token" }) }));
vi.mock("../i18n", () => ({ useTranslation: () => ({ language: "en" }) }));
vi.mock("../lib/computerVisionConsent", () => ({ readComputerVisionConsent: () => state.allowed }));
vi.mock("../services/adminFaceTrackingPreview", () => ({ authorizeAdminPreview: vi.fn(), createAdminFaceTrackingPreview: vi.fn() }));

const getFrame = vi.fn(() => null);
const render = (active = true) => renderToStaticMarkup(<AdminFaceTrackingPreview active={active} scenario="atm-withdrawal" getFrame={getFrame} />);
beforeEach(() => {
  vi.clearAllMocks(); state.role = "admin"; state.authenticated = true; state.loading = false; state.allowed = true;
  state.values = [true, false, false, null]; state.index = 0; state.effects = []; state.setters = [];
});

describe("scenario admin preview control", () => {
  it("shows a usable toggle to a verified admin and starts OFF without a canvas", () => {
    const html = render();
    expect(html).toContain('role="switch"'); expect(html).toContain('aria-checked="false"');
    expect(html).toContain("OFF"); expect(html).not.toContain("<canvas");
    expect(html).toContain("w-full min-w-0");
    expect(html).not.toContain("fixed right-3");
    expect(html).toContain("Collapse preview panel");
    state.effects[1](); expect(createAdminFaceTrackingPreview).not.toHaveBeenCalled();
  });

  it("can render a compact collapsed OFF header without moving the scenario", () => {
    state.values = [true, false, false, null, true];
    const html = render();
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("Expand preview panel");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("Local admin preview only");
  });

  it("ON displays the camera canvas and derived tracking summary", () => {
    state.values = [true, true, false, { cameraTrackingActive: true, faceDetected: true, landmarkCount: 478,
      headPose: { yaw: 10, pitch: -5, roll: 2 }, estimatedEyeDirection: "left", isUserInteracting: true }];
    const html = render();
    expect(html).toContain('aria-checked="true"'); expect(html).toContain("<canvas");
    expect(html).toContain("478"); expect(html).toContain("10.0°"); expect(html).toContain("Left");
    expect(html).toContain("Keyboard/mouse activity");
  });

  it.each(["user", "guest"])("never mounts the preview for %s even with ON state", (role) => {
    state.role = role; state.values = [true, true, false, null];
    expect(render()).toBe(""); expect(state.effects).toEqual([]);
  });

  it("requires authentication, completed account loading, active scenario and server authorization", () => {
    state.authenticated = false; expect(render()).toBe("");
    state.authenticated = true; state.loading = true; expect(render()).toBe("");
    state.loading = false; expect(render(false)).toBe("");
    state.values = [false, true, false, null]; expect(render()).toBe("");
    state.effects[1](); expect(createAdminFaceTrackingPreview).not.toHaveBeenCalled();
  });

  it("No consent disables the switch and cannot create a preview even if ON is forced", () => {
    state.allowed = false; state.values = [true, true, false, null];
    const html = render();
    expect(html).toContain('disabled=""'); expect(html).not.toContain("<canvas");
    state.effects[1](); expect(createAdminFaceTrackingPreview).not.toHaveBeenCalled();
  });

  it("server denial overrides a locally claimed admin role", async () => {
    vi.mocked(authorizeAdminPreview).mockResolvedValue(false);
    state.values = [false, false, false, null]; render();
    state.effects[0](); await Promise.resolve();
    expect(authorizeAdminPreview).toHaveBeenCalledWith("token");
    expect(state.setters[0]).toHaveBeenCalledWith(false);
  });

  it("preview OFF/unmount/pagehide removes its rendering loop without owning camera cleanup", () => {
    const surface = new EventTarget(); vi.stubGlobal("window", surface);
    const remove = vi.spyOn(surface, "removeEventListener");
    const preview = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
    vi.mocked(createAdminFaceTrackingPreview).mockReturnValue(preview);
    state.values = [true, true, false, null]; render();
    const cleanup = state.effects[1]();
    expect(preview.start).toHaveBeenCalledOnce();
    surface.dispatchEvent(new Event("pagehide")); expect(preview.stop).toHaveBeenCalledOnce();
    if (typeof cleanup === "function") cleanup();
    expect(remove).toHaveBeenCalledWith("pagehide", preview.stop);
    expect(preview.stop).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("has wording for all six supported languages", () => {
    expect(Object.keys(adminFaceTrackingPreviewTranslations).sort()).toEqual(["de", "en", "es", "fr", "pt", "tr"]);
    for (const text of Object.values(adminFaceTrackingPreviewTranslations)) {
      expect(Object.values(text).every((value) => value.length > 0)).toBe(true);
    }
  });
});
