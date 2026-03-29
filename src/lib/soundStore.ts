import { get, writable } from "svelte/store";
import { getItem, setItem } from "./storage";

const DEFAULT_SOUND_VOLUME = 50;
const DEFAULT_SOUND_MUTED = false;

function parseSoundVolume(storedValue: string | null): number | null {
    if (storedValue === null) return null;
    const n = Number(storedValue);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
    return null;
}

function getSoundVolume(): number {
    const stored = parseSoundVolume(getItem("sound-volume"));
    return stored ?? DEFAULT_SOUND_VOLUME;
}

function setSoundVolume(value: number) {
    setItem("sound-volume", String(value));
}

function createSoundVolumeStore() {
    const { subscribe, set } = writable(getSoundVolume());

    return {
        subscribe,
        set: (value: number) => {
            setSoundVolume(value);
            set(value);
        },
        resetToDefault: () => {
            setSoundVolume(DEFAULT_SOUND_VOLUME);
            set(DEFAULT_SOUND_VOLUME);
        },
    };
}

export const soundVolume = createSoundVolumeStore();

function parseSoundMuted(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getSoundMuted(): boolean {
    const stored = parseSoundMuted(getItem("sound-muted"));
    return stored ?? DEFAULT_SOUND_MUTED;
}

function setSoundMuted(value: boolean) {
    setItem("sound-muted", String(value));
}

function createSoundMutedStore() {
    const { subscribe, set } = writable(getSoundMuted());

    return {
        subscribe,
        set: (value: boolean) => {
            setSoundMuted(value);
            set(value);
        },
        resetToDefault: () => {
            setSoundMuted(DEFAULT_SOUND_MUTED);
            set(DEFAULT_SOUND_MUTED);
        },
    };
}

export const soundMuted = createSoundMutedStore();

/**
 * Returns the effective volume in 0–1 range for the sound engine.
 *
 * Applies an x^0.85 curve to counteract the OS logarithmic volume curve.
 * This keeps sounds audible at lower system volumes without being louder
 * at max. Slider 50% → 0.55 effective, slider 100% → 1.0 effective.
 */
export function effectiveVolume(): number {
    if (get(soundMuted)) return 0;
    return Math.pow(get(soundVolume) / 100, 0.85);
}
