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
