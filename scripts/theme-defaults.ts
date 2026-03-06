/**
 * Pre-computed theme colors for the default preset (Cyan: #00b4c3, h=198, c=0.24, l=0.65).
 * Used by static assets that can't call the runtime theme engine.
 *
 * THEME_BG: oklchToHex(BG_L*0.5 + SURFACE_L*0.5, c*0.14, h)
 * - Used in index.html: <meta name="theme-color">
 *
 * THEME_ACCENT: oklchToHex(0.65, c, h)
 * - Used in public/icon.svg: g { stroke } (dark mode)
 *
 * THEME_ACCENT_LIGHT: oklchToHex(0.4, c, h)
 * - Used in public/icon.svg: @media (light) g { stroke }
 */
export const THEME_BG = "#00191a";
export const THEME_ACCENT = "#00b4c3";
export const THEME_ACCENT_LIGHT = "#006775";
