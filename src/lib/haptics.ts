import { showToast, showToastDelayed } from "./toast";

const HAPTIC_COOLDOWN_MS = 500;
let lastHapticAt = 0;
/** Only call vibrate after a user gesture to avoid Chrome's "[Intervention] Blocked call to navigator.vibrate because user hasn't tapped on the frame..." */
let userHasTouched = true;

/** Set to true to show toast messages for haptic debug (e.g. on Android). */
export const HAPTIC_DEBUG = true;

function markInteracted() {
  userHasTouched = true;
  if (HAPTIC_DEBUG) {
    showToast("Haptics: user gesture recorded", { durationMs: 1500 });
  }
  for (const ev of ["click", "touchstart", "keydown"]) {
    window.removeEventListener(ev, markInteracted);
  }
}

export function triggerHaptic(durationMs = 5) {
  const secure = typeof window !== "undefined" && window.isSecureContext;
  const hasVibrateNow = typeof navigator !== "undefined" && "vibrate" in navigator;

  if (hasVibrateNow) {
    navigator.vibrate(1000);
    showToast(`Haptic: vibrate(1000ms) | secure=${secure}`, { durationMs: 2500 });
  } else {
    showToast("Haptic: no vibrate API", { tone: "negative", durationMs: 2000 });
  }
}

const hasWindow = typeof window !== "undefined";
const hasNavigator = typeof navigator !== "undefined";
const hasVibrate = hasNavigator && "vibrate" in navigator;
const isCoarsePointer = hasWindow && window.matchMedia
  ? window.matchMedia("(pointer: coarse)").matches
  : false;
const shouldEnableHaptics = hasWindow && hasNavigator && hasVibrate && isCoarsePointer;

if (shouldEnableHaptics) {
  for (const ev of ["click", "touchstart", "keydown"]) {
    window.addEventListener(ev, markInteracted, { once: true, passive: true });
  }
}

if (HAPTIC_DEBUG && hasWindow) {
  showToastDelayed(
    hasVibrate
      ? isCoarsePointer
        ? "Haptics: enabled (touch device, vibrate API)"
        : "Haptics: disabled (not touch device)"
      : "Haptics: disabled (no vibrate API)",
    { durationMs: 3500 },
  );
}