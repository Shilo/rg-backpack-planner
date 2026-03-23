import { get, readable, writable } from "svelte/store";
import { getItem, removeItem, setItem } from "./storage";

export const DEFAULT_REDUCE_MOTION = false;

function parseReduceMotion(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getReduceMotion(): boolean {
    const stored = parseReduceMotion(getItem("reduce-motion"));
    return stored ?? DEFAULT_REDUCE_MOTION;
}

function setReduceMotion(value: boolean) {
    setItem("reduce-motion", String(value));
}

function createReduceMotionStore() {
    const { subscribe, set } = writable(getReduceMotion());

    return {
        subscribe,
        set: (value: boolean) => {
            setReduceMotion(value);
            set(value);
        },
        resetToDefault: () => {
            removeItem("reduce-motion");
            set(DEFAULT_REDUCE_MOTION);
        },
    };
}

export const reduceMotion = createReduceMotionStore();

export function prefersSystemReducedMotion(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

export function prefersNoAnimations() {
    return get(reduceMotion) || prefersSystemReducedMotion();
}

export const animationsDisabled = readable(prefersNoAnimations(), (set) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        const unsubscribe = reduceMotion.subscribe((value) => {
            set(value);
        });
        return unsubscribe;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
        set(get(reduceMotion) || mediaQuery.matches);
    };
    const unsubscribe = reduceMotion.subscribe(() => {
        update();
    });

    update();

    if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", update);
        return () => {
            unsubscribe();
            mediaQuery.removeEventListener("change", update);
        };
    }

    mediaQuery.addListener(update);
    return () => {
        unsubscribe();
        mediaQuery.removeListener(update);
    };
});
