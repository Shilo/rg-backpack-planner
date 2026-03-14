/**
 * Central image export format configuration.
 *
 * Change EXPORT_FORMAT to switch the entire compose pipeline
 * between "png" and "webp". All capture, crop, combine, stats,
 * share, and filename logic references these constants.
 */

export const EXPORT_FORMAT: "png" | "webp" = "png";

export const EXPORT_MIME = `image/${EXPORT_FORMAT}` as const;

export const EXPORT_EXT = `.${EXPORT_FORMAT}` as const;

/**
 * Fixed device pixel ratio for capture output.
 * Overrides window.devicePixelRatio so output is consistent across devices.
 */
export const EXPORT_DPR = 2;

/**
 * Target resolution: longest edge of a single cropped tree image, in physical pixels.
 */
export const EXPORT_TARGET_LONG_EDGE_PX = 1200;

/**
 * Upper cap on computed snapdom scale to prevent canvas size limit failures
 * on very small viewports.
 */
export const EXPORT_MAX_SCALE = 4;
