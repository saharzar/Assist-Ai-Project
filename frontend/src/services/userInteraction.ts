export const USER_INTERACTION_TIMEOUT_MS = 1500;
export const MOUSE_MOVEMENT_THRESHOLD_PX = 8;
export type UserInteractionOptions = {
  timeoutMs?: number;
  movementThresholdPx?: number;
  target?: EventTarget | null;
};

/** Recent input only: retains no keys, button values, or input text. */
export function createUserInteractionTracker({
  timeoutMs = USER_INTERACTION_TIMEOUT_MS,
  movementThresholdPx = MOUSE_MOVEMENT_THRESHOLD_PX,
  target = typeof window === "undefined" ? null : window,
}: UserInteractionOptions = {}) {
  let listening = false;
  let activeUntil: number | null = null;
  let movementAnchor: { x: number; y: number } | null = null;
  const listenerOptions = { capture: true, passive: true };

  function markInteraction() {
    if (listening) activeUntil = performance.now() + timeoutMs;
  }

  function handleMovement(event: Event) {
    const { clientX: x, clientY: y } = event as MouseEvent;
    if (!listening || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!movementAnchor) {
      movementAnchor = { x, y };
      return;
    }
    // Measure displacement from an anchor, not accumulated path length:
    // back-and-forth jitter below this threshold never prolongs interaction.
    if (Math.hypot(x - movementAnchor.x, y - movementAnchor.y) >= movementThresholdPx) {
      movementAnchor = { x, y };
      markInteraction();
    }
  }

  function stop() {
    if (listening) {
      target?.removeEventListener("keydown", markInteraction, listenerOptions);
      target?.removeEventListener("mousedown", markInteraction, listenerOptions);
      target?.removeEventListener("mousemove", handleMovement, listenerOptions);
    }
    listening = false;
    activeUntil = null;
    movementAnchor = null;
  }

  function start() {
    if (listening) return;
    activeUntil = null;
    movementAnchor = null;
    listening = true;
    target?.addEventListener("keydown", markInteraction, listenerOptions);
    target?.addEventListener("mousedown", markInteraction, listenerOptions);
    target?.addEventListener("mousemove", handleMovement, listenerOptions);
  }

  return {
    start, stop,
    // A monotonic deadline avoids an extra timeout for every input event.
    isUserInteracting: () => listening && activeUntil !== null && performance.now() < activeUntil,
  };
}
