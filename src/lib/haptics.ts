const HAPTIC_COOLDOWN_MS = 140;
let lastHapticAt = 0;
/** Only call vibrate after a user gesture to avoid Chrome's "[Intervention] Blocked call to navigator.vibrate because user hasn't tapped on the frame..." */
let userHasTouched = false;

function markInteracted() {
  userHasTouched = true;
  for (const ev of ["click", "touchstart", "keydown"]) {
    window.removeEventListener(ev, markInteracted);
  }
}

export function triggerHaptic(durationMs = 5) {
  if (!userHasTouched) return; // Avoid Chrome intervention (see comment on userHasInteracted)

  const now = Date.now();
  if (now - lastHapticAt < HAPTIC_COOLDOWN_MS) return;
  lastHapticAt = now;

  navigator.vibrate(durationMs);
}

if (typeof window !== "undefined"
  && typeof navigator !== "undefined"
  && ("vibrate" in navigator)
  && !(window.matchMedia && !window.matchMedia("(pointer: coarse)").matches)) {
  for (const ev of ["click", "touchstart", "keydown"]) {
    window.addEventListener(ev, markInteracted, { once: true, passive: true });
  }
}