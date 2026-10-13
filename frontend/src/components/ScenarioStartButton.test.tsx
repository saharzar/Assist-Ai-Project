import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScenarioStartButton } from "./ScenarioStartButton";
import { ComputerVisionDialog } from "./ComputerVisionDialog";
import { computerVisionConsentTranslations } from "../lib/computerVisionConsentTranslations";
import type { LanguageCode } from "../i18n";

const state = vi.hoisted(() => ({ consent: true as boolean | null, token: "login-one", navigate: vi.fn(),
  language: "en" as LanguageCode, values: [] as unknown[], refs: [] as Array<{ current: unknown }>,
  stateIndex: 0, refIndex: 0, effects: [] as Array<() => void | (() => void)> }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useRef: (value: unknown) => {
    const index = state.refIndex++;
    return state.refs[index] ?? (state.refs[index] = { current: value });
  },
  useState: (initial: unknown) => {
    const index = state.stateIndex++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = typeof value === "function" ? value(state.values[index]) : value; }];
  },
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => state.navigate }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ computerVisionConsent: state.consent, token: state.token }) }));
vi.mock("../i18n", () => ({ useTranslation: () => ({ language: state.language }) }));
vi.mock("../services/speechSynthesisService", () => ({ stopAssistantSpeech: vi.fn(), unlockAssistantAudioPlayback: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./ComputerVisionDialog", () => ({ ComputerVisionDialog: () => null }));

let getUserMedia: ReturnType<typeof vi.fn>;
let track: { readyState: string; enabled: boolean; stop: ReturnType<typeof vi.fn> };
let stream: MediaStream;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
function render(to = "/scenario/atm-withdrawal/setup") {
  state.stateIndex = 0; state.refIndex = 0; state.effects = [];
  return ScenarioStartButton({ to, className: "start-button", children: "Start" });
}
function elements(node: ReactNode): ReactElement[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node, ...Children.toArray(node.props.children).flatMap(elements)];
}
function click(tree: ReactNode, index = 0) {
  const button = elements(tree).filter((item) => item.type === "button")[index];
  (button.props as { onClick: () => void }).onClick();
}
beforeEach(() => {
  vi.clearAllMocks(); state.consent = true; state.token = "login-one"; state.language = "en";
  state.values = []; state.refs = []; state.effects = [];
  track = { readyState: "live", enabled: true, stop: vi.fn() };
  stream = { getVideoTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
  getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
});
afterEach(() => vi.unstubAllGlobals());

describe("camera validation on scenario Start", () => {
  it("never requests a camera on introduction mount or rerender", async () => {
    render(); state.effects[0](); await flush(); render();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it.each(["/scenario/atm-withdrawal/setup", "/scenario/online-bill-payment/setup"])("checks only on Start, releases the probe, then continues to %s", async (to) => {
    let resolve!: (value: MediaStream) => void;
    getUserMedia.mockImplementationOnce(() => new Promise<MediaStream>((complete) => { resolve = complete; }));
    const tree = render(to); state.effects[0]();
    click(tree); click(tree);
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(state.navigate).not.toHaveBeenCalled();
    resolve(stream); await flush();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(state.navigate).toHaveBeenCalledExactlyOnceWith(to);
  });

  it.each([false, null])("bypasses the camera entirely for consent %s", async (consent) => {
    state.consent = consent;
    const tree = render(); state.effects[0](); click(tree); await flush();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(state.navigate).toHaveBeenCalledExactlyOnceWith("/scenario/atm-withdrawal/setup");
  });

  it.each(["NotAllowedError", "NotFoundError", "NotReadableError"])("blocks navigation on %s, and Try again can continue after recovery", async (name) => {
    getUserMedia.mockRejectedValueOnce(new DOMException("Unavailable", name));
    const tree = render(); state.effects[0](); click(tree); await flush();
    expect(state.navigate).not.toHaveBeenCalled();
    const failed = render();
    const dialog = elements(failed).find((element) => element.type === ComputerVisionDialog)!;
    expect(dialog).toBeDefined();
    expect((dialog.props as { message: string }).message).toBe(computerVisionConsentTranslations.en.cameraUnavailableMessage);
    click(failed, 1); await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(state.navigate).toHaveBeenCalledOnce();
  });

  it("stops a late stream after leaving and does not navigate", async () => {
    let resolve!: (value: MediaStream) => void;
    getUserMedia.mockImplementationOnce(() => new Promise<MediaStream>((complete) => { resolve = complete; }));
    const tree = render(); const cleanup = state.effects[0](); click(tree);
    if (cleanup) cleanup();
    resolve(stream); await flush();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("does not reuse an earlier login's successful check", async () => {
    const first = render(); const cleanup = state.effects[0](); click(first); await flush();
    if (cleanup) cleanup();
    state.token = "login-two";
    const second = render(); state.effects[0](); click(second); await flush();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it.each(Object.keys(computerVisionConsentTranslations) as LanguageCode[])("passes simple translated camera errors to the voiced dialog in %s", async (language) => {
    state.language = language;
    getUserMedia.mockRejectedValueOnce(new DOMException("Unavailable", "NotFoundError"));
    const tree = render(); state.effects[0](); click(tree); await flush();
    const failed = render();
    const dialog = elements(failed).find((element) => element.type === ComputerVisionDialog)!;
    const text = computerVisionConsentTranslations[language];
    expect(dialog.props).toEqual(expect.objectContaining({ title: text.cameraUnavailable, message: text.cameraUnavailableMessage }));
    const retry = elements(failed).filter((element) => element.type === "button")[1];
    expect((retry.props as { children: ReactNode }).children).toBe(text.cameraRetry);
  });
});
