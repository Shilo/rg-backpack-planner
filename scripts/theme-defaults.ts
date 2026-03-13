/**
 * Pre-computed theme colors for the default preset (Sky: #00adfc, h=234, c=0.18).
 * Used by static assets that can't call the runtime theme engine.
 *
 * THEME_BG: oklchToHex(0.10, max(c*0.22, 0.03), h)
 * - Used in index.html: <meta name="theme-color">
 *
 * THEME_ACCENT: oklchToHex(0.7, c, h)
 * - Used in public/icon.svg: g { stroke } (dark mode)
 *
 * THEME_ACCENT_LIGHT: oklchToHex(0.45, c, h)
 * - Used in public/icon.svg: @media (light) g { stroke }
 */
export const THEME_BG = "#00040e";
export const THEME_ACCENT = "#00adfc";
export const THEME_ACCENT_LIGHT = "#005ea8";
