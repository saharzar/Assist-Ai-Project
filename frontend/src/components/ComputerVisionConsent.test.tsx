import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComputerVisionConsentGate } from "./ComputerVisionConsent";
import { AtmAssistantMessage } from "./atm/AtmAssistantMessage";
import { computerVisionConsentTranslations } from "../lib/computerVisionConsentTranslations";
import { speakAssistantMessage, stopAssistantSpeech, unlockAssistantAudioPlayback } from "../services/speechSynthesisService";
import type { LanguageCode } from "../i18n";

const state = vi.hoisted(() => ({ authenticated: true, loading: false, choice: null as boolean | null,
  language: "en" as LanguageCode, choose: vi.fn(), effects: [] as Array<() => void | (() => void)>,
  refIndex: 0, dialog: { showModal: vi.fn(), close: vi.fn() }, title: { focus: vi.fn() } }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => ({ current: state.refIndex++ === 0 ? state.dialog : state.refIndex === 2 ? state.title : initial }),
  useState: (initial: unknown) => [initial, vi.fn()],
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: state.authenticated,
  isLoading: state.loading, computerVisionConsent: state.choice, chooseComputerVisionConsent: state.choose }) }));
vi.mock("../i18n", () => ({ useTranslation: () => ({ language: state.language }) }));
vi.mock("../services/speechSynthesisService", () => ({ speakAssistantMessage: vi.fn(), stopAssistantSpeech: vi.fn(), unlockAssistantAudioPlayback: vi.fn().mockResolvedValue(undefined) }));

function render() { return renderToStaticMarkup(<ComputerVisionConsentGate><p>Scenario content</p></ComputerVisionConsentGate>); }
function dialogTree() {
  const element = ComputerVisionConsentGate({ children: "Scenario content" }) as ReactElement<{ onChoose: (allowed: boolean) => void }>;
  return (element.type as (props: typeof element.props) => ReactElement)(element.props);
}
function elements(node: ReactNode): ReactElement[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node, ...Children.toArray(node.props.children).flatMap(elements)];
}
beforeEach(() => {
  vi.clearAllMocks(); state.authenticated = true; state.loading = false; state.choice = null;
  state.language = "en"; state.effects = []; state.refIndex = 0;
  vi.stubGlobal("localStorage", { getItem: () => null });
});
afterEach(() => vi.unstubAllGlobals());

describe("post-login camera analysis consent", () => {
  it("blocks scenario mounting until an explicit choice, with neither option preselected", () => {
    const html = render();
    expect(html).toContain("<dialog");
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Yes, save my analysis data");
    expect(html).toContain("No, do not save my analysis data");
    expect(html).not.toContain("Scenario content");
    expect(html).not.toMatch(/checked|autofocus/);
    expect(state.choose).not.toHaveBeenCalled();
  });

  it.each([true, false])("allows scenarios after choice %s without repeating the popup", (choice) => {
    state.choice = choice;
    expect(render()).toContain("Scenario content");
    expect(render()).not.toContain("<dialog");
  });

  it("does not prompt signed-out users or guests, or prompt while authentication is being validated", () => {
    state.authenticated = false;
    expect(render()).not.toContain("<dialog");
    state.authenticated = true; state.loading = true;
    expect(render()).not.toMatch(/<dialog|Scenario content/);
  });

  it.each([true, false])("records the explicit %s button choice and stops speech", (choice) => {
    const buttons = elements(dialogTree()).filter((element) => element.type === "button");
    (buttons[choice ? 0 : 1].props as { onClick: () => void }).onClick();
    expect(state.choose).toHaveBeenCalledExactlyOnceWith(choice);
    expect(stopAssistantSpeech).toHaveBeenCalledOnce();
  });

  it("opens a native modal, focuses its title, and prevents Escape from bypassing the choice", () => {
    const tree = dialogTree();
    const cleanup = state.effects[0]();
    expect(state.dialog.showModal).toHaveBeenCalledOnce();
    expect(state.title.focus).toHaveBeenCalledOnce();
    const event = { preventDefault: vi.fn() };
    (tree.props as { onCancel: (value: { preventDefault: () => void }) => void }).onCancel(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(state.choose).not.toHaveBeenCalled();
    if (cleanup) cleanup();
    expect(state.dialog.close).toHaveBeenCalledOnce();
  });

  it("uses the existing TTS with browser fallback, repeat, and cleanup", async () => {
    const assistant = elements(dialogTree()).find((element) => element.type === AtmAssistantMessage)!;
    const cleanup = state.effects[1]();
    expect(speakAssistantMessage).toHaveBeenCalledWith(expect.stringContaining("during this session?"),
      expect.objectContaining({ allowBrowserFallback: true }), "en");
    (assistant.props as { onRepeat: () => void }).onRepeat();
    await Promise.resolve();
    expect(unlockAssistantAudioPlayback).toHaveBeenCalledOnce();
    expect(speakAssistantMessage).toHaveBeenCalledTimes(2);
    if (cleanup) cleanup();
    expect(stopAssistantSpeech).toHaveBeenCalledOnce();
  });

  it("respects sound-off for automatic speech but still allows an explicit replay", async () => {
    vi.stubGlobal("localStorage", { getItem: () => "false" });
    const assistant = elements(dialogTree()).find((element) => element.type === AtmAssistantMessage)!;
    state.effects[1]();
    expect(speakAssistantMessage).not.toHaveBeenCalled();
    (assistant.props as { onRepeat: () => void }).onRepeat();
    await Promise.resolve();
    expect(speakAssistantMessage).toHaveBeenCalledOnce();
  });

  it("cancels a pending replay when the dialog closes", async () => {
    let unlock!: () => void;
    vi.mocked(unlockAssistantAudioPlayback).mockReturnValueOnce(new Promise((resolve) => { unlock = resolve; }));
    const assistant = elements(dialogTree()).find((element) => element.type === AtmAssistantMessage)!;
    const cleanup = state.effects[1]();
    (assistant.props as { onRepeat: () => void }).onRepeat();
    if (cleanup) cleanup();
    unlock(); await Promise.resolve();
    expect(speakAssistantMessage).toHaveBeenCalledOnce();
  });

  it.each(Object.keys(computerVisionConsentTranslations) as LanguageCode[])("renders and reads the popup in %s", (language) => {
    state.language = language;
    const text = computerVisionConsentTranslations[language];
    const html = render();
    expect(html).toContain(text.legend);
    expect(html).toContain(text.yes);
    expect(html).toContain(text.no);
    state.effects[1]();
    expect(speakAssistantMessage).toHaveBeenCalledWith(`${text.legend}. ${text.description}`, expect.any(Object), language);
  });
});
