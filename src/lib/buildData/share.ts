/**
 * High-level share operations
 * Handles clipboard and image sharing functionality
 */

import type { BuildData } from "./encoder";
import { createShareUrl } from "./url";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { get } from "svelte/store";

/**
 * Copies text to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
    if (
        typeof navigator === "undefined" ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
    ) {
        return false;
    }

    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        return false;
    }
}

/**
 * Saves a build to a shareable URL and copies it to clipboard
 * @param buildName Optional build name to include in the share URL
 * @param customBuildData Optional build data to share. If not provided, uses current store state
 */
export async function saveBuildToUrl(
    buildName?: string | null,
    customBuildData?: BuildData,
): Promise<boolean> {
    try {
        const buildData: BuildData = customBuildData
            ? {
                  ...customBuildData,
                  ...(buildName && { name: buildName }),
              }
            : {
                  trees: get(treeLevels),
                  owned: get(techCrystalsOwned),
                  ...(buildName && { name: buildName }),
              };
        const shareUrl = createShareUrl(buildData);
        const success = await copyToClipboard(shareUrl);
        if (success) {
            console.log(shareUrl);
        }
        return success;
    } catch (error) {
        console.error("Failed to save build URL:", error);
        return false;
    }
}

/**
 * Saves the current build as an image
 * TODO: Implement screenshot functionality for all 3 trees
 * This would require html2canvas or similar library
 */
export async function saveBuildAsImage(): Promise<boolean> {
    // TODO: Implement screenshot functionality
    // This would require:
    // 1. Installing html2canvas or similar library
    // 2. Capturing screenshots of all 3 trees
    // 3. Combining them into a single image
    // 4. Triggering download or share
    return false;
}

/**
 * Result status for native/clipboard URL sharing
 */
export type ShareBuildUrlResult = "shared" | "copied" | "cancelled" | "failed";

/**
 * Shares a build URL using the Web Share API when available,
 * falling back to copying the URL to the clipboard.
 *
 * @param options Share options including optional buildName, title, text, and customBuildData
 * @returns Status string describing what happened:
 * - "shared": Native share dialog succeeded.
 * - "cancelled": User dismissed the native share dialog.
 * - "copied": URL was copied to clipboard (fallback).
 * - "failed": All mechanisms failed.
 */
export async function shareBuildUrlNative(options?: {
    buildName?: string | null;
    title?: string;
    text?: string;
    customBuildData?: BuildData;
}): Promise<ShareBuildUrlResult> {
    // SSR / non-browser guard
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return "failed";
    }

    const buildData: BuildData = options?.customBuildData
        ? {
              ...options.customBuildData,
              ...(options.buildName && { name: options.buildName }),
          }
        : {
              trees: get(treeLevels),
              owned: get(techCrystalsOwned),
              ...(options?.buildName && { name: options.buildName }),
          };
    const shareUrl = createShareUrl(buildData);

    // Prefer Web Share API when available
    if (typeof navigator.share === "function") {
        try {
            await navigator.share({
                url: shareUrl,
                title: options?.title,
                text: options?.text,
            });
            return "shared";
        } catch (error: unknown) {
            // If user cancels the dialog, treat as a non-error cancellation
            const err = error as { name?: string };
            if (err?.name === "AbortError") {
                return "cancelled";
            }

            console.error(
                "Failed to share via Web Share API, falling back:",
                error,
            );
            // Fall through to clipboard fallback
        }
    }

    // Clipboard fallback
    const clipboardSuccess = await copyToClipboard(shareUrl);
    return clipboardSuccess ? "copied" : "failed";
}
