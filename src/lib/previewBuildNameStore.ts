import { writable } from "svelte/store";

/**
 * Store that tracks the name of the currently previewed build (if any)
 * Set when loading a build from URL that includes a name
 */
export const previewBuildName = writable<string | null>(null);

/**
 * Sets the preview build name
 */
export function setPreviewBuildName(name: string | null): void {
  previewBuildName.set(name);
}

/**
 * Clears the preview build name
 */
export function clearPreviewBuildName(): void {
  previewBuildName.set(null);
}
