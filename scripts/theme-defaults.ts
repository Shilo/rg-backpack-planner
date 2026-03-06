/**
 * Pre-computed theme colors for the default preset (Cyan: #44faff, h=198, c=0.14, l=0.9).
 * Used by static assets that can't call the runtime theme engine.
 *
 * THEME_BG: oklchToHex(BG_L*0.5 + SURFACE_L*0.5, c*0.14, h)
 * - Used in index.html: <meta name="theme-color">
 *
 * THEME_ACCENT: oklchToHex(0.9, c, h)
 * - Used in public/icon.svg: g { stroke } (dark mode)
 *
 * THEME_ACCENT_LIGHT: oklchToHex(0.45, c, h)
 * - Used in public/icon.svg: @media (light) g { stroke }
 */
export const THEME_BG = "#0a1818";
export const THEME_ACCENT = "#44faff";
export const THEME_ACCENT_LIGHT = "#006a71";
