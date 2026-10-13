export const USER_INTERACTION_TIMEOUT_MS = 1500;
export type UserInteractionOptions = {
  timeoutMs?: number;
  target?: EventTarget | null;
};

/** Recent keyboard activity only: retains no pressed keys or input text. */
export function createUserInteractionTracker({
  timeoutMs = USER_INTERACTION_TIMEOUT_MS,
  target = typeof window === "undefined" ? null : window,
}: UserInteractionOptions = {}) {
  let listening = false;
  let activeUntil: number | null = null;
  const listenerOptions = { capture: true, passive: true };

  function markInteraction() {
    if (listening) activeUntil = performance.now() + timeoutMs;
  }

  function stop() {
    if (listening) {
      target?.removeEventListener("keydown", markInteraction, listenerOptions);
    }
    listening = false;
    activeUntil = null;
  }

  function start() {
    if (listening) return;
    activeUntil = null;
    listening = true;
    target?.addEventListener("keydown", markInteraction, listenerOptions);
  }

  return {
    start, stop,
    // A monotonic deadline avoids an extra timeout for every input event.
    isUserInteracting: () => listening && activeUntil !== null && performance.now() < activeUntil,
  };
}
