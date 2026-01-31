export const LONG_PRESS_MS = 450;
export const LONG_PRESS_MOVE_THRESHOLD = 8;

/** Suppress the next pointerup/click for this pointer (invalidates touch after long-press) */
const suppressedPointerIds = new Set<number>();
let suppressClickUntil = 0;

export function suppressNextPointerUp(pointerId: number) {
  suppressedPointerIds.add(pointerId);
}

function handlePointerUp(event: PointerEvent) {
  if (!suppressedPointerIds.has(event.pointerId)) return;
  suppressedPointerIds.delete(event.pointerId);
  suppressClickUntil = Date.now() + 200;
  event.preventDefault();
  event.stopImmediatePropagation();
  
  // Manually clear :active state by resetting transform
  const target = event.target;
  if (target instanceof HTMLElement) {
    // Blur to remove focus/active state
    target.blur();
    // Force clear transform by overriding it temporarily
    target.style.transform = "scale(1)";
    // Remove inline style after repaint - CSS :active won't reapply since element is no longer active
    requestAnimationFrame(() => {
      target.style.removeProperty("transform");
    });
  }
}

function handleClick(event: MouseEvent) {
  if (Date.now() > suppressClickUntil) return;
  suppressClickUntil = 0;
  event.preventDefault();
  event.stopImmediatePropagation();
}

if (typeof document !== "undefined") {
  document.addEventListener("pointerup", handlePointerUp, { capture: true });
  document.addEventListener("click", handleClick, { capture: true });
}

export type LongPressState = {
  timer: number | null;
  fired: boolean;
};

export function startLongPress(
  state: LongPressState,
  onTrigger: () => boolean | void,
  delayMs = LONG_PRESS_MS,
) {
  clearLongPress(state);
  state.fired = false;
  state.timer = window.setTimeout(() => {
    state.timer = null;
    const didTrigger = onTrigger();
    if (didTrigger !== false) {
      state.fired = true;
    }
  }, delayMs);
}

export function clearLongPress(state: LongPressState) {
  if (state.timer !== null) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

export function isLongPressMovement(
  startX: number,
  startY: number,
  x: number,
  y: number,
  threshold = LONG_PRESS_MOVE_THRESHOLD,
) {
  return Math.hypot(x - startX, y - startY) > threshold;
}
