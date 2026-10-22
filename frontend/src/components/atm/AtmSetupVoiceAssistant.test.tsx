import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtmSetupVoiceAssistant } from "./AtmSetupVoiceAssistant";
import { AtmAssistantMessage } from "./AtmAssistantMessage";
import { speakAssistantMessage, stopAssistantSpeech } from "../../services/speechSynthesisService";
const hooks = vi.hoisted(() => ({ values: [] as unknown[], refs: [] as Array<{ current: unknown }>, stateIndex: 0, refIndex: 0,
  effects: [] as Array<() => void | (() => void)> }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.stateIndex++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === "function" ? initial() : initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value; }];
  },
  useRef: (initial: unknown) => { const index = hooks.refIndex++; return hooks.refs[index] ?? (hooks.refs[index] = { current: initial }); },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
}));
vi.mock("../../services/speechSynthesisService", () => ({ speakAssistantMessage: vi.fn(), stopAssistantSpeech: vi.fn(),
  stopSuccessSound: vi.fn(), unlockAssistantAudioPlayback: vi.fn().mockResolvedValue(undefined) }));
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node as ReactElement<Record<string, unknown>>, ...Children.toArray(node.props.children).flatMap(elements)];
}
function render(onSpeakingChange: (speaking: boolean) => void) {
  hooks.stateIndex = 0; hooks.refIndex = 0; hooks.effects = [];
  const tree = AtmSetupVoiceAssistant({ language: "en", message: "Welcome! Choose a meal.", modeLabel: "Restaurant", speechRequestId: 0, onSpeakingChange });
  return elements(tree).find((element) => element.type === AtmAssistantMessage)!.props;
}
const callbacks = () => { const calls = vi.mocked(speakAssistantMessage).mock.calls; return calls[calls.length - 1][1]!; };
beforeEach(() => {
  vi.clearAllMocks(); hooks.values = []; hooks.refs = [];
  vi.stubGlobal("localStorage", { getItem: () => "true", setItem: vi.fn() });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("shared assistant speaking notifications", () => {
  it("waits for the waiter entrance before starting the welcome", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    hooks.stateIndex = 0; hooks.refIndex = 0; hooks.effects = [];
    AtmSetupVoiceAssistant({ language: "en", message: "Welcome", modeLabel: "Restaurant", speechRequestId: 0, scenario: "restaurant", compact: true, speechDelayMs: 650 });
    const cleanup = hooks.effects[0]();
    vi.advanceTimersByTime(649);
    expect(speakAssistantMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); await Promise.resolve();
    expect(speakAssistantMessage).toHaveBeenCalledWith("Welcome", expect.objectContaining({ scenario: "restaurant" }), "en");
    if (typeof cleanup === "function") cleanup();
  });
  it("speaks the restaurant welcome and repeats it from the compact bubble control", async () => {
    const change = vi.fn();
    hooks.stateIndex = 0; hooks.refIndex = 0; hooks.effects = [];
    const message = "Hello, welcome to our restaurant. Here is our menu. Take your time, and when you're ready, choose what you would like.";
    const tree = AtmSetupVoiceAssistant({ language: "en", message, modeLabel: "Restaurant", speechRequestId: 0, onSpeakingChange: change, scenario: "restaurant", compact: true });
    const repeat = elements(tree).find((element) => element.type === "button")!;
    expect(repeat.props["aria-label"]).toBe("Repeat assistant message");
    hooks.effects[0](); await Promise.resolve();
    expect(speakAssistantMessage).toHaveBeenCalledWith(message, expect.objectContaining({ scenario: "restaurant" }), "en");
    (repeat.props.onClick as () => void)(); await Promise.resolve();
    expect(speakAssistantMessage).toHaveBeenCalledTimes(2);
  });
  it("notifies only when playback starts and stops immediately on Stop Voice", async () => {
    const change = vi.fn(); const props = render(change);
    (props.onRepeat as () => void)(); await Promise.resolve();
    expect(change).toHaveBeenLastCalledWith(false);
    const first = callbacks(); first.onStart?.(); expect(change).toHaveBeenLastCalledWith(true);
    const speaking = render(change); expect(speaking.isSpeaking).toBe(true);
    (speaking.onStop as () => void)(); expect(change).toHaveBeenLastCalledWith(false);
    expect(stopAssistantSpeech).toHaveBeenCalled();
    // Late callbacks from stopped audio cannot restart the avatar.
    first.onStart?.(); expect(change).toHaveBeenLastCalledWith(false);
    expect(render(change).isSpeaking).toBe(false);
  });
  it("restarts speaking on Repeat and clears it on completion, error and unmount", async () => {
    const change = vi.fn();
    (render(change).onRepeat as () => void)(); await Promise.resolve();
    callbacks().onStart?.(); callbacks().onEnd?.(); expect(change).toHaveBeenLastCalledWith(false);
    (render(change).onRepeat as () => void)(); await Promise.resolve();
    callbacks().onStart?.(); expect(change).toHaveBeenLastCalledWith(true);
    callbacks().onError?.("Unavailable"); expect(change).toHaveBeenLastCalledWith(false);
    render(change); const cleanup = hooks.effects[hooks.effects.length - 1]();
    if (typeof cleanup === "function") cleanup();
    expect(change).toHaveBeenLastCalledWith(false);
  });
  it("settles restaurant speech only after the active playback ends, including Repeat and Stop", async () => {
    const settled = vi.fn(); const change = vi.fn();
    hooks.stateIndex = 0; hooks.refIndex = 0; hooks.effects = [];
    const tree = AtmSetupVoiceAssistant({ language: "en", message: "Processing payment", modeLabel: "Restaurant", speechRequestId: 0, onSpeakingChange: change, onMessageSettled: settled, scenario: "restaurant", compact: true });
    const repeat = elements(tree).find((element) => element.type === "button")!;
    hooks.effects[0](); await Promise.resolve();
    const first = callbacks();
    (repeat.props.onClick as () => void)(); await Promise.resolve();
    first.onEnd?.(); expect(settled).not.toHaveBeenCalled();
    callbacks().onEnd?.(); expect(settled).toHaveBeenCalledOnce();
    expect(settled).toHaveBeenCalledWith("Processing payment", "ended");

    (repeat.props.onClick as () => void)(); await Promise.resolve();
    const active = callbacks(); active.onStart?.();
    hooks.stateIndex = 0; hooks.refIndex = 0; hooks.effects = [];
    const speaking = AtmSetupVoiceAssistant({ language: "en", message: "Processing payment", modeLabel: "Restaurant", speechRequestId: 0, onSpeakingChange: change, onMessageSettled: settled, scenario: "restaurant", compact: true });
    const stop = elements(speaking).filter((element) => element.type === "button")[1];
    (stop.props.onClick as () => void)();
    expect(settled).toHaveBeenLastCalledWith("Processing payment", "stopped");
    active.onEnd?.(); expect(settled).toHaveBeenCalledTimes(2);
  });
  it("releases restaurant progression when voice is disabled", () => {
    const settled = vi.fn();
    vi.stubGlobal("localStorage", { getItem: () => "false", setItem: vi.fn() });
    hooks.stateIndex = 0; hooks.refIndex = 0; hooks.effects = [];
    AtmSetupVoiceAssistant({ language: "en", message: "Processing payment", modeLabel: "Restaurant", speechRequestId: 0, onMessageSettled: settled, scenario: "restaurant", compact: true });
    hooks.effects[0]();
    expect(settled).toHaveBeenCalledWith("Processing payment", "skipped");
    expect(speakAssistantMessage).not.toHaveBeenCalled();
  });
});
