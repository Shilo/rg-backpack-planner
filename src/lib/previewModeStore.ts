import { writable, get } from "svelte/store";

/**
 * Store that tracks whether we're in preview mode (viewing a shared URL build)
 * In preview mode, changes update the URL instead of localStorage
 */
export const isPreviewMode = writable(false);

/**
 * Sets the preview mode state
 */
export function setPreviewMode(value: boolean): void {
  isPreviewMode.set(value);
}

/**
 * Gets the current preview mode state
 */
export function getIsPreviewMode(): boolean {
  return get(isPreviewMode);
}
