// M3-inspired dynamic color theme engine — zero dependencies
// Generates all CSS color variables from a single source hex color
// using oklch tonal palettes and hue harmonization.

// ── Color Math ──────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
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

function rgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
    const lr = linearize(r);
    const lg = linearize(g);
    const lb = linearize(b);

    // sRGB → linear LMS (via XYZ, using Oklab's combined matrix)
    const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s_ = 0.0883024619 * lr + 0.2220049941 * lg + 0.6896925440 * lb;

    const l_c = Math.cbrt(l_);
    const m_c = Math.cbrt(m_);
    const s_c = Math.cbrt(s_);

    const L = 0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c;
    const a = 1.9779984951 * l_c - 2.4285922050 * m_c + 0.4505937099 * s_c;
    const bk = 0.0259040371 * l_c + 0.7827717662 * m_c - 0.8086757660 * s_c;

    const C = Math.sqrt(a * a + bk * bk);
    let H = (Math.atan2(bk, a) * 180) / Math.PI;
    if (H < 0) H += 360;

    return { l: L, c: C, h: H };
}

function oklchToHex(L: number, C: number, H: number): string {
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const bk = C * Math.sin(hRad);

    const l_c = L + 0.3963377774 * a + 0.2158037573 * bk;
    const m_c = L - 0.1055613458 * a - 0.0638541728 * bk;
    const s_c = L - 0.0894841775 * a - 1.2914855480 * bk;

    const l_ = l_c * l_c * l_c;
    const m_ = m_c * m_c * m_c;
    const s_ = s_c * s_c * s_c;

    // LMS → linear sRGB
    const lr = +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
    const lg = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
    const lb = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_;

    const r = delinearize(lr);
    const g = delinearize(lg);
    const b = delinearize(lb);

    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ── Tonal Palette ───────────────────────────────────────────

function tonalPalette(
    hue: number,
    chroma: number,
    tones: number[],
): Map<number, string> {
    const map = new Map<number, string>();
    for (const t of tones) {
        map.set(t, oklchToHex(t / 100, chroma, hue));
    }
    return map;
}

// ── Hue Harmonization ───────────────────────────────────────

function harmonize(regionHue: number, sourceHue: number, amount = 0.15): number {
    let diff = regionHue - sourceHue;
    // Shortest arc
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (sourceHue + diff * (1 - amount) + 360) % 360;
}

// ── Theme Application ───────────────────────────────────────

export function applyTheme(sourceHex = "#4c6fff"): void {
    const [r, g, b] = hexToRgb(sourceHex);
    const source = rgbToOklch(r, g, b);

    const vars: Record<string, string> = {};

    const neutralChroma = source.c * 0.06;
    const textChroma = source.c * 0.08;

    // Neutral surfaces
    vars["--bg"] = oklchToHex(0.15, neutralChroma, source.h);
    vars["--bg-panel"] = oklchToHex(0.18, neutralChroma, source.h);
    vars["--bg-input"] = oklchToHex(0.21, neutralChroma, source.h);
    vars["--surface"] = oklchToHex(0.24, neutralChroma, source.h);
    vars["--bg-raised"] = oklchToHex(0.27, neutralChroma, source.h);
    vars["--border"] = oklchToHex(0.35, neutralChroma, source.h);
    vars["--border-subtle"] = oklchToHex(0.30, neutralChroma, source.h);

    // Text
    vars["--text"] = oklchToHex(0.93, textChroma, source.h);
    vars["--text-muted"] = oklchToHex(0.78, textChroma, source.h);
    vars["--text-disabled"] = oklchToHex(0.55, textChroma, source.h);

    // Primary accent
    vars["--accent"] = oklchToHex(0.70, source.c, source.h);
    vars["--accent-light"] = oklchToHex(0.82, source.c, source.h);
    vars["--border-focus"] = oklchToHex(0.75, source.c, source.h);

    // Error/Danger (fixed hue ~29°)
    const dangerHue = 29;
    const dangerChroma = 0.16;
    vars["--accent-danger"] = oklchToHex(0.70, dangerChroma, dangerHue);
    vars["--danger-bg"] = oklchToHex(0.22, dangerChroma * 0.4, dangerHue);
    vars["--danger-border"] = oklchToHex(0.45, dangerChroma, dangerHue);
    vars["--danger-text"] = oklchToHex(0.85, dangerChroma * 0.6, dangerHue);

    // Success (fixed hue ~220°)
    const successHue = 220;
    const successChroma = 0.12;
    vars["--accent-success"] = oklchToHex(0.72, successChroma, successHue);
    vars["--success-bg"] = oklchToHex(0.22, successChroma * 0.4, successHue);
    vars["--success-border"] = oklchToHex(0.45, successChroma, successHue);
    vars["--success-text"] = oklchToHex(0.85, successChroma * 0.6, successHue);

    // Node locked (neutral, very low chroma)
    const lockedChroma = neutralChroma * 0.5;
    vars["--node-locked-bg"] = oklchToHex(0.28, lockedChroma, source.h);
    vars["--node-locked-border"] = oklchToHex(0.38, lockedChroma, source.h);
    vars["--node-locked-text"] = oklchToHex(0.52, lockedChroma, source.h);

    // Region accent palettes
    const regions: { name: string; hue: number; chroma: number }[] = [
        { name: "orange", hue: 55, chroma: 0.18 },
        { name: "yellow", hue: 100, chroma: 0.16 },
        { name: "blue", hue: 255, chroma: 0.15 },
    ];

    for (const region of regions) {
        const hue = harmonize(region.hue, source.h, 0.15);
        const c = region.chroma;

        vars[`--region-${region.name}-accent`] = oklchToHex(0.72, c, hue);
        vars[`--region-${region.name}-light`] = oklchToHex(0.85, c, hue);
        vars[`--region-${region.name}-bg-available`] = oklchToHex(0.22, c * 0.5, hue);
        vars[`--region-${region.name}-bg-active`] = oklchToHex(0.30, c * 0.6, hue);
        vars[`--region-${region.name}-bg-maxed`] = oklchToHex(0.38, c * 0.7, hue);
        vars[`--region-${region.name}-text`] = oklchToHex(0.80, c * 0.7, hue);
        vars[`--region-${region.name}-text-maxed`] = oklchToHex(0.90, c * 0.5, hue);
    }

    // Shadow (uses bg color)
    const bgHex = vars["--bg"];
    vars["--shadow"] = `0 8px 20px ${bgHex}80`;
    vars["--shadow-node"] = `0 4px 10px ${bgHex}80`;
    vars["--shadow-node-hex"] = `0 4px 5px ${bgHex}`;

    // Apply to :root
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
    }
}
