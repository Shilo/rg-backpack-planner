import { get, writable } from "svelte/store";
import { getItem, setItem } from "./storage";

const DEFAULT_HAPTICS_ENABLED = true;

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
    if (!get(hapticsEnabled)) return;
    if (!userHasTouched) return; // Avoid Chrome intervention (see comment on userHasInteracted)

    const now = Date.now();
    if (now - lastHapticAt < HAPTIC_COOLDOWN_MS) return;
    lastHapticAt = now;

    navigator.vibrate(durationMs);
}

if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "vibrate" in navigator &&
    !(window.matchMedia && !window.matchMedia("(pointer: coarse)").matches)
) {
    for (const ev of ["click", "touchstart", "keydown"]) {
        window.addEventListener(ev, markInteracted, {
            once: true,
            passive: true,
        });
    }
}

function parseHapticsEnabled(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getHapticsEnabled(): boolean {
    const stored = parseHapticsEnabled(getItem("haptics-enabled"));
    return stored ?? DEFAULT_HAPTICS_ENABLED;
}

function setHapticsEnabled(value: boolean) {
    setItem("haptics-enabled", String(value));
}

function createHapticsStore() {
    const { subscribe, set } = writable(getHapticsEnabled());

    return {
        subscribe,
        set: (value: boolean) => {
            setHapticsEnabled(value);
            set(value);
        },
        resetToDefault: () => {
            setHapticsEnabled(DEFAULT_HAPTICS_ENABLED);
            set(DEFAULT_HAPTICS_ENABLED);
        },
    };
}

export const hapticsEnabled = createHapticsStore();
