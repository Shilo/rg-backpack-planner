/**
 * Pre-computed theme colors for the default preset (Blue: h=260, c=0.26).
 * Used by static assets that can't call the runtime theme engine.
 *
 * BG:     oklchToHex(BG_L*0.5 + SURFACE_L*0.5, c*0.14, h)  — see themeApply.ts syncThemeColorMeta
 * ACCENT: oklchToHex(0.7, c, h)                              — see themeEngine.ts applyTheme (dark --accent)
 * ACCENT_LIGHT: oklchToHex(0.45, c, h)                       — see themeEngine.ts applyTheme (light --accent)
 */
export const THEME_BG = "#0b1525";
export const THEME_ACCENT = "#2692ff";
export const THEME_ACCENT_LIGHT = "#0038e1";
