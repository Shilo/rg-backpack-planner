// M3-inspired dynamic color theme engine — zero dependencies
// Generates all CSS color variables from a source OKLCH hue + chroma
// using oklch tonal palettes and hue harmonization.

// ── Color Math ──────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function linearize(c: number): number {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function delinearize(c: number): number {
    const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(Math.max(s, 0), 1) * 255);
}

export function rgbToOklch(
    r: number,
    g: number,
    b: number,
): { l: number; c: number; h: number } {
    const lr = linearize(r);
    const lg = linearize(g);
    const lb = linearize(b);

    // sRGB → linear LMS (via XYZ, using Oklab's combined matrix)
    const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s_ = 0.0883024619 * lr + 0.2220049941 * lg + 0.689692544 * lb;

    const l_c = Math.cbrt(l_);
    const m_c = Math.cbrt(m_);
    const s_c = Math.cbrt(s_);

    const L = 0.2104542553 * l_c + 0.793617785 * m_c - 0.0040720468 * s_c;
    const a = 1.9779984951 * l_c - 2.428592205 * m_c + 0.4505937099 * s_c;
    const bk = 0.0259040371 * l_c + 0.7827717662 * m_c - 0.808675766 * s_c;

    const C = Math.sqrt(a * a + bk * bk);
    let H = (Math.atan2(bk, a) * 180) / Math.PI;
    if (H < 0) H += 360;

    return { l: L, c: C, h: H };
}

export function oklchToHex(L: number, C: number, H: number): string {
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const bk = C * Math.sin(hRad);

    const l_c = L + 0.3963377774 * a + 0.2158037573 * bk;
    const m_c = L - 0.1055613458 * a - 0.0638541728 * bk;
    const s_c = L - 0.0894841775 * a - 1.291485548 * bk;

    const l_ = l_c * l_c * l_c;
    const m_ = m_c * m_c * m_c;
    const s_ = s_c * s_c * s_c;

    // LMS → linear sRGB
    const lr = +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
    const lg = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
    const lb = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;

    const r = delinearize(lr);
    const g = delinearize(lg);
    const b = delinearize(lb);

    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/** Convert hex to OKLCH {h, c} (convenience for color picker). */
export function hexToOklch(hex: string): { h: number; c: number } {
    const [r, g, b] = hexToRgb(hex);
    const { c, h } = rgbToOklch(r, g, b);
    return { h, c };
}

export interface ThemePreset {
    h: number;
    c: number;
    l?: number;
    label: string;
}

function normalizeHueDistance(a: number, b: number): number {
    const raw = Math.abs(a - b) % 360;
    return Math.min(raw, 360 - raw);
}

/**
 * Keeps presets perceptually separated so future additions do not cluster.
 */
export function createSpacedThemePresets(
    presets: ThemePreset[],
    minHueDistance = 26,
    minChromaDistance = 0.035,
): ThemePreset[] {
    const accepted: ThemePreset[] = [];
    for (const preset of presets) {
        const isDistinct = accepted.every((existing) => {
            const hueDistance = normalizeHueDistance(existing.h, preset.h);
            const chromaDistance = Math.abs(existing.c - preset.c);
            return (
                hueDistance >= minHueDistance ||
                chromaDistance >= minChromaDistance
            );
        });
        if (isDistinct) {
            accepted.push(preset);
        }
    }
    return accepted;
}

// ── Hue Harmonization ───────────────────────────────────────

function harmonize(
    regionHue: number,
    sourceHue: number,
    amount: number,
): number {
    let diff = regionHue - sourceHue;
    // Shortest arc
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (sourceHue + diff * (1 - amount) + 360) % 360;
}

// ── Theme Source ────────────────────────────────────────────

export interface ThemeSource {
    h: number; // hue 0–360
    c: number; // chroma 0–0.4+
    l?: number; // optional accent lightness 0–1
}

// ── Theme Application ───────────────────────────────────────

export function applyTheme(
    source: ThemeSource = { h: 264, c: 0.19 },
    mode: "dark" | "light" = "dark",
): void {
    const isDark = mode === "dark";
    const vars: Record<string, string> = {};

    const neutralChroma = Math.max(0.008, source.c * (isDark ? 0.2 : 0.16));
    const textChroma = source.c * (isDark ? 0.11 : 0.09);
    const harmonizeAmount = 0.25;

    if (isDark) {
        vars["--surface-dim"] = oklchToHex(0.11, neutralChroma, source.h);
        vars["--surface"] = oklchToHex(0.14, neutralChroma, source.h);
        vars["--surface-bright"] = oklchToHex(0.2, neutralChroma, source.h);
        vars["--surface-container-lowest"] = oklchToHex(0.16, neutralChroma, source.h);
        vars["--surface-container-low"] = oklchToHex(0.2, neutralChroma, source.h);
        vars["--surface-container"] = oklchToHex(0.24, neutralChroma, source.h);
        vars["--surface-container-high"] = oklchToHex(0.28, neutralChroma, source.h);
        vars["--surface-container-highest"] = oklchToHex(0.32, neutralChroma, source.h);
        vars["--outline"] = oklchToHex(0.46, neutralChroma, source.h);
        vars["--outline-variant"] = oklchToHex(0.38, neutralChroma, source.h);
    } else {
        vars["--surface-dim"] = oklchToHex(0.89, neutralChroma, source.h);
        vars["--surface"] = oklchToHex(0.98, neutralChroma, source.h);
        vars["--surface-bright"] = oklchToHex(1, neutralChroma, source.h);
        vars["--surface-container-lowest"] = oklchToHex(1, neutralChroma, source.h);
        vars["--surface-container-low"] = oklchToHex(0.965, neutralChroma, source.h);
        vars["--surface-container"] = oklchToHex(0.94, neutralChroma, source.h);
        vars["--surface-container-high"] = oklchToHex(0.915, neutralChroma, source.h);
        vars["--surface-container-highest"] = oklchToHex(0.89, neutralChroma, source.h);
        vars["--outline"] = oklchToHex(0.67, neutralChroma, source.h);
        vars["--outline-variant"] = oklchToHex(0.78, neutralChroma, source.h);
    }

    vars["--bg"] = vars["--surface"];
    vars["--bg-panel"] = vars["--surface-container"];
    vars["--bg-input"] = vars["--surface-container-highest"];
    vars["--bg-raised"] = vars["--surface-container-high"];
    vars["--border"] = vars["--outline"];
    vars["--border-subtle"] = vars["--outline-variant"];

    if (isDark) {
        vars["--text"] = oklchToHex(0.94, textChroma, source.h);
        vars["--text-muted"] = oklchToHex(0.8, textChroma, source.h);
        vars["--text-disabled"] = oklchToHex(0.58, textChroma, source.h);
        vars["--on-surface-variant"] = oklchToHex(0.84, textChroma, source.h);
    } else {
        vars["--text"] = oklchToHex(0.2, textChroma, source.h);
        vars["--text-muted"] = oklchToHex(0.38, textChroma, source.h);
        vars["--text-disabled"] = oklchToHex(0.58, textChroma, source.h);
        vars["--on-surface-variant"] = oklchToHex(0.35, textChroma, source.h);
    }

    const accentL = source.l ?? (isDark ? 0.78 : 0.52);
    const accentLightL = source.l ?? (isDark ? 0.9 : 0.44);
    vars["--accent"] = oklchToHex(accentL, source.c, source.h);
    vars["--accent-light"] = oklchToHex(accentLightL, source.c * (isDark ? 0.85 : 0.8), source.h);

    vars["--primary"] = vars["--accent"];
    vars["--on-primary"] = isDark
        ? oklchToHex(0.16, source.c * 0.2, source.h)
        : oklchToHex(0.99, source.c * 0.1, source.h);
    vars["--primary-container"] = isDark
        ? oklchToHex(0.34, source.c * 0.55, source.h)
        : oklchToHex(0.9, source.c * 0.4, source.h);
    vars["--on-primary-container"] = isDark
        ? oklchToHex(0.92, source.c * 0.2, source.h)
        : oklchToHex(0.26, source.c * 0.5, source.h);
    vars["--secondary-container"] = vars["--surface-container-high"];
    vars["--on-secondary-container"] = vars["--on-surface-variant"];

    vars["--state-hover"] = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
    vars["--state-pressed"] = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)";

    const focusHue = (source.h + 16) % 360;
    vars["--border-focus"] = isDark
        ? oklchToHex(0.82, source.c * 0.45, focusHue)
        : oklchToHex(0.55, source.c * 0.5, focusHue);

    const dangerHue = 25;
    const dangerChroma = 0.18;
    if (isDark) {
        vars["--accent-danger"] = oklchToHex(0.76, dangerChroma, dangerHue);
        vars["--danger-bg"] = oklchToHex(0.3, dangerChroma * 0.55, dangerHue);
        vars["--danger-border"] = oklchToHex(0.5, dangerChroma, dangerHue);
        vars["--danger-text"] = oklchToHex(0.9, dangerChroma * 0.45, dangerHue);
    } else {
        vars["--accent-danger"] = oklchToHex(0.56, dangerChroma, dangerHue);
        vars["--danger-bg"] = oklchToHex(0.93, dangerChroma * 0.3, dangerHue);
        vars["--danger-border"] = oklchToHex(0.66, dangerChroma, dangerHue);
        vars["--danger-text"] = oklchToHex(0.37, dangerChroma * 0.55, dangerHue);
    }

    const successHue = 150;
    const successChroma = 0.14;
    if (isDark) {
        vars["--accent-success"] = oklchToHex(0.78, successChroma, successHue);
        vars["--success-bg"] = oklchToHex(0.3, successChroma * 0.5, successHue);
        vars["--success-border"] = oklchToHex(0.5, successChroma, successHue);
        vars["--success-text"] = oklchToHex(0.9, successChroma * 0.4, successHue);
    } else {
        vars["--accent-success"] = oklchToHex(0.5, successChroma, successHue);
        vars["--success-bg"] = oklchToHex(0.93, successChroma * 0.26, successHue);
        vars["--success-border"] = oklchToHex(0.64, successChroma, successHue);
        vars["--success-text"] = oklchToHex(0.34, successChroma * 0.5, successHue);
    }

    const lockedChroma = neutralChroma * 0.5;
    if (isDark) {
        vars["--node-locked-bg"] = oklchToHex(0.28, lockedChroma, source.h);
        vars["--node-locked-border"] = oklchToHex(0.38, lockedChroma, source.h);
        vars["--node-locked-text"] = oklchToHex(0.52, lockedChroma, source.h);
    } else {
        vars["--node-locked-bg"] = oklchToHex(0.88, lockedChroma, source.h);
        vars["--node-locked-border"] = oklchToHex(0.75, lockedChroma, source.h);
        vars["--node-locked-text"] = oklchToHex(0.6, lockedChroma, source.h);
    }

    vars["--node-flash-color"] = isDark
        ? "rgba(255, 255, 255, 0.5)"
        : "rgba(0, 0, 0, 0.25)";

    const regions: { name: string; hue: number; chroma: number }[] = [
        { name: "orange", hue: 25, chroma: 0.23 },
        { name: "yellow", hue: 95, chroma: 0.19 },
        { name: "blue", hue: 255, chroma: 0.15 },
    ];

    for (const region of regions) {
        const rawHue = region.hue;
        const softenedHue = harmonize(region.hue, source.h, harmonizeAmount);
        const chroma = region.chroma;

        if (isDark) {
            vars[`--region-${region.name}-accent`] = oklchToHex(0.72, chroma, rawHue);
            vars[`--region-${region.name}-light`] = oklchToHex(0.85, chroma, rawHue);
            vars[`--region-${region.name}-bg-available`] = oklchToHex(0.22, chroma * 0.5, softenedHue);
            vars[`--region-${region.name}-bg-active`] = oklchToHex(0.36, chroma * 0.7, rawHue);
            vars[`--region-${region.name}-bg-maxed`] = oklchToHex(0.46, chroma * 0.8, rawHue);
            vars[`--region-${region.name}-text`] = oklchToHex(0.8, chroma * 0.7, rawHue);
            vars[`--region-${region.name}-text-maxed`] = oklchToHex(0.9, chroma * 0.5, rawHue);
        } else {
            vars[`--region-${region.name}-accent`] = oklchToHex(0.5, chroma, rawHue);
            vars[`--region-${region.name}-light`] = oklchToHex(0.4, chroma, rawHue);
            vars[`--region-${region.name}-bg-available`] = oklchToHex(0.92, chroma * 0.3, softenedHue);
            vars[`--region-${region.name}-bg-active`] = oklchToHex(0.86, chroma * 0.4, rawHue);
            vars[`--region-${region.name}-bg-maxed`] = oklchToHex(0.8, chroma * 0.5, rawHue);
            vars[`--region-${region.name}-text`] = oklchToHex(0.3, chroma * 0.7, rawHue);
            vars[`--region-${region.name}-text-maxed`] = oklchToHex(0.2, chroma * 0.5, rawHue);
        }
    }

    if (isDark) {
        const bgHex = vars["--bg"];
        vars["--shadow"] = `0 8px 20px ${bgHex}80`;
        vars["--shadow-node"] = `0 4px 10px ${bgHex}80`;
        vars["--shadow-node-hex"] = `0 4px 5px ${bgHex}`;
        vars["--backdrop-overlay"] = "rgba(0, 0, 0, 0.5)";
    } else {
        vars["--shadow"] = "0 8px 20px rgba(0,0,0,0.08)";
        vars["--shadow-node"] = "0 4px 10px rgba(0,0,0,0.10)";
        vars["--shadow-node-hex"] = "0 2px 4px rgba(0,0,0,0.12)";
        vars["--backdrop-overlay"] = "rgba(0, 0, 0, 0.6)";
    }

    if (isDark) {
        vars["--brightness-hover"] = "brightness(1.2)";
        vars["--node-brightness-locked"] = "brightness(0.7)";
        vars["--node-brightness-available"] = "brightness(0.65)";
        vars["--shadow-text"] =
            "0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.6), 1px 0 2px rgba(0,0,0,0.9), -1px 0 2px rgba(0,0,0,0.9)";
    } else {
        vars["--brightness-hover"] = "brightness(0.92)";
        vars["--node-brightness-locked"] = "brightness(1.1) saturate(0.3)";
        vars["--node-brightness-available"] = "brightness(1.05) saturate(0.5)";
        vars["--shadow-text"] =
            "0 1px 2px rgba(0,0,0,0.3), 0 0 4px rgba(0,0,0,0.15), 1px 0 2px rgba(0,0,0,0.3), -1px 0 2px rgba(0,0,0,0.3)";
    }

    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
    }
}
