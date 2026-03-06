/**
 * Pre-computed theme colors for the default preset (Cyan: #00dbe5, h=201.4, c=0.156).
 * Used by static assets that can't call the runtime theme engine.
 *
 * THEME_BG: oklchToHex(BG_L*0.5 + SURFACE_L*0.5, c*0.14, h)
 * - Used in index.html: <meta name="theme-color">
 *
 * THEME_ACCENT: oklchToHex(0.7, c, h)
 * - Used in public/icon.svg: g { stroke } (dark mode)
 *
 * THEME_ACCENT_LIGHT: oklchToHex(0.45, c, h)
 * - Used in public/icon.svg: @media (light) g { stroke }
 */
export const THEME_BG = "#081819";
export const THEME_ACCENT = "#00bec8";
export const THEME_ACCENT_LIGHT = "#006b79";
