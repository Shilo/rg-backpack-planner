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

    // ── Mode-dependent parameters ──
    const neutralChroma = source.c * (isDark ? 0.14 : 0.12);
    const textChroma = source.c * (isDark ? 0.1 : 0.08);
    const harmonizeAmount = 0.25;

    // ── Neutral surfaces ──
    if (isDark) {
        vars["--bg"] = oklchToHex(0.15, neutralChroma, source.h);
        vars["--bg-panel"] = oklchToHex(0.18, neutralChroma, source.h);
        vars["--bg-input"] = oklchToHex(0.21, neutralChroma, source.h);
        vars["--surface"] = oklchToHex(0.24, neutralChroma, source.h);
        vars["--bg-raised"] = oklchToHex(0.27, neutralChroma, source.h);
        vars["--border"] = oklchToHex(0.35, neutralChroma, source.h);
        vars["--border-subtle"] = oklchToHex(0.3, neutralChroma, source.h);
    } else {
        vars["--bg"] = oklchToHex(0.96, neutralChroma, source.h);
        vars["--bg-panel"] = oklchToHex(0.94, neutralChroma, source.h);
        vars["--bg-input"] = oklchToHex(0.92, neutralChroma, source.h);
        vars["--surface"] = oklchToHex(0.9, neutralChroma, source.h);
        vars["--bg-raised"] = oklchToHex(0.95, neutralChroma, source.h);
        vars["--border"] = oklchToHex(0.72, neutralChroma, source.h);
        vars["--border-subtle"] = oklchToHex(0.8, neutralChroma, source.h);
    }

    // ── Text ──
    if (isDark) {
        vars["--text"] = oklchToHex(0.93, textChroma, source.h);
        vars["--text-muted"] = oklchToHex(0.78, textChroma, source.h);
        vars["--text-disabled"] = oklchToHex(0.55, textChroma, source.h);
    } else {
        vars["--text"] = oklchToHex(0.18, textChroma, source.h);
        vars["--text-muted"] = oklchToHex(0.38, textChroma, source.h);
        vars["--text-disabled"] = oklchToHex(0.55, textChroma, source.h);
    }

    // ── Primary accent ──
    if (isDark) {
        const accentL = source.l ?? 0.7;
        vars["--accent"] = oklchToHex(accentL, source.c, source.h);
        vars["--accent-light"] = oklchToHex(
            Math.min(accentL + 0.12, 0.95),
            source.c,
            source.h,
        );
        vars["--border-focus"] = oklchToHex(
            Math.min(accentL + 0.05, 0.95),
            source.c,
            source.h,
        );
    } else {
        const accentL = source.l ?? 0.45;
        vars["--accent"] = oklchToHex(accentL, source.c, source.h);
        vars["--accent-light"] = oklchToHex(
            Math.min(accentL + 0.1, 0.95),
            source.c,
            source.h,
        );
        vars["--border-focus"] = oklchToHex(
            Math.min(accentL + 0.05, 0.95),
            source.c,
            source.h,
        );
    }

    // ── Error/Danger ──
    const dangerHue = 29;
    const dangerChroma = 0.16;
    if (isDark) {
        vars["--accent-danger"] = oklchToHex(0.7, dangerChroma, dangerHue);
        vars["--danger-bg"] = oklchToHex(0.22, dangerChroma * 0.4, dangerHue);
        vars["--danger-border"] = oklchToHex(0.45, dangerChroma, dangerHue);
        vars["--danger-text"] = oklchToHex(0.85, dangerChroma * 0.6, dangerHue);
    } else {
        vars["--accent-danger"] = oklchToHex(0.5, dangerChroma, dangerHue);
        vars["--danger-bg"] = oklchToHex(0.94, dangerChroma * 0.3, dangerHue);
        vars["--danger-border"] = oklchToHex(0.65, dangerChroma, dangerHue);
        vars["--danger-text"] = oklchToHex(0.35, dangerChroma * 0.6, dangerHue);
    }

    // ── Success ──
    const successHue = 220;
    const successChroma = 0.12;
    if (isDark) {
        vars["--accent-success"] = oklchToHex(0.72, successChroma, successHue);
        vars["--success-bg"] = oklchToHex(
            0.22,
            successChroma * 0.4,
            successHue,
        );
        vars["--success-border"] = oklchToHex(0.45, successChroma, successHue);
        vars["--success-text"] = oklchToHex(
            0.85,
            successChroma * 0.6,
            successHue,
        );
    } else {
        vars["--accent-success"] = oklchToHex(0.45, successChroma, successHue);
        vars["--success-bg"] = oklchToHex(
            0.94,
            successChroma * 0.3,
            successHue,
        );
        vars["--success-border"] = oklchToHex(0.65, successChroma, successHue);
        vars["--success-text"] = oklchToHex(
            0.35,
            successChroma * 0.6,
            successHue,
        );
    }

    // ── Node locked ──
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

    // ── Node flash ──
    vars["--node-flash-color"] = isDark
        ? "rgba(255, 255, 255, 0.5)"
        : "rgba(0, 0, 0, 0.25)";

    // ── Region accent palettes ──
    const regions: { name: string; hue: number; chroma: number }[] = [
        { name: "orange", hue: 25, chroma: 0.23 },
        { name: "yellow", hue: 95, chroma: 0.19 },
        { name: "blue", hue: 255, chroma: 0.15 },
    ];

    for (const region of regions) {
        const rawHue = region.hue;
        const softenedHue = harmonize(region.hue, source.h, harmonizeAmount);
        const c = region.chroma;

        if (isDark) {
            vars[`--region-${region.name}-accent`] = oklchToHex(
                0.72,
                c,
                rawHue,
            );
            vars[`--region-${region.name}-light`] = oklchToHex(0.85, c, rawHue);
            vars[`--region-${region.name}-bg-available`] = oklchToHex(
                0.22,
                c * 0.5,
                softenedHue,
            );
            vars[`--region-${region.name}-bg-active`] = oklchToHex(
                0.36,
                c * 0.7,
                rawHue,
            );
            vars[`--region-${region.name}-bg-maxed`] = oklchToHex(
                0.46,
                c * 0.8,
                rawHue,
            );
            vars[`--region-${region.name}-text`] = oklchToHex(
                0.8,
                c * 0.7,
                rawHue,
            );
            vars[`--region-${region.name}-text-maxed`] = oklchToHex(
                0.9,
                c * 0.5,
                rawHue,
            );
        } else {
            vars[`--region-${region.name}-accent`] = oklchToHex(0.5, c, rawHue);
            vars[`--region-${region.name}-light`] = oklchToHex(0.4, c, rawHue);
            vars[`--region-${region.name}-bg-available`] = oklchToHex(
                0.92,
                c * 0.3,
                softenedHue,
            );
            vars[`--region-${region.name}-bg-active`] = oklchToHex(
                0.86,
                c * 0.4,
                rawHue,
            );
            vars[`--region-${region.name}-bg-maxed`] = oklchToHex(
                0.8,
                c * 0.5,
                rawHue,
            );
            vars[`--region-${region.name}-text`] = oklchToHex(
                0.3,
                c * 0.7,
                rawHue,
            );
            vars[`--region-${region.name}-text-maxed`] = oklchToHex(
                0.2,
                c * 0.5,
                rawHue,
            );
        }
    }

    // ── Shadows ──
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

    // ── Dynamic filter variables (mode-dependent) ──
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

    // ── Apply to :root ──
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
    }
}
