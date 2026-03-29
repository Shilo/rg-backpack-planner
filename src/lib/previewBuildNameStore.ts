import { writable } from "svelte/store";
import { truncateText } from "./stringUtil";
import { tr } from "svelte-whisper";

/**
 * Store that tracks the name of the currently previewed build (if any)
 * Set when loading a build from URL that includes a name
 */
export const previewBuildName = writable<string | null>(null);

/**
 * Increments on every preview build load, including same-named builds.
 * Used as a change signal when the build name alone is insufficient.
 */
export const previewLoadCount = writable(0);

/**
 * Sets the preview build name
 */
export function setPreviewBuildName(name: string | null): void {
    previewBuildName.set(name);
    previewLoadCount.update((n) => n + 1);
}

/**
 * Clears the preview build name
 */
export function clearPreviewBuildName(): void {
    previewBuildName.set(null);
    previewLoadCount.update((n) => n + 1);
}

/**
 * Returns the build name if it exists, otherwise returns localized preview title.
 */
export function getPreviewTitle(buildName: string | null): string {
    return buildName ? truncateText(buildName) : tr("preview.title");
}
