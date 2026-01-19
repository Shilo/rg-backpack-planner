export const LONG_PRESS_MS = 450;
export const LONG_PRESS_MOVE_THRESHOLD = 8;

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
