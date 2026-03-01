import { writable } from "svelte/store";
import { truncateText } from "./stringUtil";
import { tr } from "./i18n";

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

/**
 * Returns the build name if it exists, otherwise returns localized preview title.
 */
export function getPreviewTitle(buildName: string | null): string {
    return buildName ? truncateText(buildName) : tr("preview.title");
}
