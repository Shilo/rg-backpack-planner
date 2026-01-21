const HAPTIC_COOLDOWN_MS = 140;
let lastHapticAt = 0;

export function triggerHaptic(durationMs = 5) {
  if (typeof navigator === "undefined" || typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;
  if (window.matchMedia && !window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  const now = Date.now();
  if (now - lastHapticAt < HAPTIC_COOLDOWN_MS) return;
  lastHapticAt = now;

  navigator.vibrate(durationMs);
}
