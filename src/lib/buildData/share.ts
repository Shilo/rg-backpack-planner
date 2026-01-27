/**
 * High-level share operations
 * Handles clipboard and image sharing functionality
 */

import { createShareUrl } from "./url";

/**
 * Saves the current build to a shareable URL and copies it to clipboard
 */
export async function saveBuildToUrl(): Promise<boolean> {
  try {
    const shareUrl = createShareUrl();
    await navigator.clipboard.writeText(shareUrl);
    return true;
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
 * Shares the current build URL using the Web Share API when available,
 * falling back to copying the URL to the clipboard.
 *
 * Returns a status string describing what happened:
 * - "shared": Native share dialog succeeded.
 * - "cancelled": User dismissed the native share dialog.
 * - "copied": URL was copied to clipboard (fallback).
 * - "failed": All mechanisms failed.
 */
export async function shareBuildUrlNative(options?: {
  title?: string;
  text?: string;
}): Promise<ShareBuildUrlResult> {
  // SSR / non-browser guard
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "failed";
  }

  const shareUrl = createShareUrl();

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
      if (err && err.name === "AbortError") {
        return "cancelled";
      }

      console.error("Failed to share via Web Share API, falling back:", error);
      // Fall through to clipboard fallback
    }
  }

  // Clipboard fallback
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return "copied";
    } catch (error) {
      console.error("Failed to copy share URL to clipboard:", error);
      return "failed";
    }
  }

  return "failed";
}
