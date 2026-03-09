import { writable, get } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";
import { formatNumber } from "./mathUtil";

const DEFAULT_SHOW_LEVEL_SPLASH = true;

function getShowLevelSplash(): boolean {
    const stored = getItem("show-level-splash");
    if (stored === null) return DEFAULT_SHOW_LEVEL_SPLASH;
    return stored === "true";
}

function createShowLevelSplashStore() {
    const { subscribe, set } = writable(getShowLevelSplash());

    return {
        subscribe,
        set: (value: boolean) => {
            setItem("show-level-splash", String(value));
            set(value);
        },
        resetToDefault: () => {
            removeItem("show-level-splash");
            set(DEFAULT_SHOW_LEVEL_SPLASH);
        },
    };
}

export const showLevelSplash = createShowLevelSplashStore();

export type SplashEntry = {
    id: string;
    levelDelta: number;
    crystalDelta: number;
};

export const splashStore = writable<SplashEntry | null>(null);

let splashTimeout: number | null = null;
let activeEl: HTMLElement | null = null;

const SPLASH_DURATION_MS = 1400;

const ARROW_UP = "\u25B2";
const ARROW_DOWN = "\u25BC";
const HEXAGON = "\u2B22";

function removeSplashEl() {
    if (activeEl) {
        activeEl.remove();
        activeEl = null;
    }
}

export function triggerSplash(levelDelta: number, crystalDelta: number) {
    if (!get(showLevelSplash)) return;
    if (levelDelta === 0 && crystalDelta === 0) return;

    if (splashTimeout !== null) {
        clearTimeout(splashTimeout);
    }
    removeSplashEl();

    const isUp = levelDelta > 0;
    const lvlText = (isUp ? "+" : "") + formatNumber(levelDelta);
    const cSign = crystalDelta > 0 ? "+" : crystalDelta < 0 ? "\u2212" : "";
    const cText = cSign + formatNumber(Math.abs(crystalDelta));

    const levelColor = isUp ? "var(--accent-light)" : "var(--accent-danger)";
    const crystalColor = isUp ? "var(--accent-danger)" : "var(--success-text)";

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:var(--z-index-toast)";

    ensureSplashKeyframes();
    overlay.innerHTML = `<div style="display:inline-flex;align-items:center;gap:14px;padding:10px 24px;border-radius:var(--radius-full);background:var(--bg-raised);border:var(--border-width) solid var(--border);box-shadow:var(--shadow);font-size:var(--font-lg);font-weight:var(--weight-bold);letter-spacing:var(--tracking);line-height:var(--leading-none);white-space:nowrap;text-transform:uppercase;animation:splash-anim 1.4s ease both">
        <span style="display:inline-flex;align-items:center;gap:6px;color:${levelColor}"><span>${isUp ? ARROW_UP : ARROW_DOWN}</span><span>${lvlText}</span></span>
        <span style="width:1px;height:18px;background:var(--border-subtle);flex-shrink:0"></span>
        <span style="display:inline-flex;align-items:center;gap:6px;color:${crystalColor}"><span>${HEXAGON}</span><span>${cText}</span></span>
    </div>`;

    document.body.appendChild(overlay);
    activeEl = overlay;

    splashTimeout = window.setTimeout(() => {
        removeSplashEl();
        splashTimeout = null;
    }, SPLASH_DURATION_MS);
}

export function ensureSplashKeyframes() {
    if (document.getElementById("splash-keyframes")) return;
    const style = document.createElement("style");
    style.id = "splash-keyframes";
    style.textContent = `@keyframes splash-anim{0%{opacity:0;transform:scale(.85) translateY(6px)}12%{opacity:1;transform:scale(1.02) translateY(0)}20%{transform:scale(1) translateY(0)}70%{opacity:1;transform:scale(1) translateY(0)}100%{opacity:0;transform:scale(.97) translateY(-8px)}}`;
    document.head.appendChild(style);
}
