/**
 * High-level share operations
 * Handles clipboard and image sharing functionality
 */

import type { BuildData } from "./encoder";
import { encodeBuildData } from "./encoder";
import { createShareUrl, createShareUrlFromToken } from "./url";
import { getRecommendedBuildForEncoded } from "./recommended";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { EXPORT_MIME } from "../buildImageExport/imageFormat";
import { get } from "svelte/store";
import { showToast } from "../toast";
import { tr } from "svelte-whisper";

/**
 * Copies text to clipboard, with execCommand fallback.
 */
async function copyToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall through to execCommand fallback
        }
    }

    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        return copied;
    } catch {
        return false;
    }
}

function resolveShareBuildData(
    buildName?: string | null,
    customBuildData?: BuildData,
): BuildData {
    return customBuildData
        ? {
              ...customBuildData,
              ...(buildName && { name: buildName }),
          }
        : {
              trees: get(treeLevels),
              owned: get(techCrystalsOwned),
              ...(buildName && { name: buildName }),
          };
}

function stripUrlScheme(url: string): string {
    return url.replace(/^[a-z]+:\/\//i, "");
}

export interface RecommendedShareUrlChoice {
    id: "full" | "short";
    displayUrl: string;
    url: string;
}

export function getRecommendedShareUrlChoices(options?: {
    buildName?: string | null;
    customBuildData?: BuildData;
}): RecommendedShareUrlChoice[] | null {
    const buildData = resolveShareBuildData(
        options?.buildName,
        options?.customBuildData,
    );
    const recommendedBuild = getRecommendedBuildForEncoded(
        encodeBuildData(buildData),
    );
    if (!recommendedBuild) {
        return null;
    }

    const fullUrl = createShareUrl(buildData);
    const shortUrl = createShareUrlFromToken(`${recommendedBuild.index}`);

    return [
        {
            id: "full",
            displayUrl: stripUrlScheme(fullUrl),
            url: fullUrl,
        },
        {
            id: "short",
            displayUrl: stripUrlScheme(shortUrl),
            url: shortUrl,
        },
    ];
}

export async function copyShareUrl(url: string): Promise<boolean> {
    return copyToClipboard(url);
}

export async function shareUrlNative(options: {
    url: string;
    title?: string;
    text?: string;
}): Promise<ShareResult> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return "failed";
    }

    if (typeof navigator.share === "function") {
        try {
            await navigator.share({
                url: options.url,
                title: options.title,
                text: options.text,
            });
            return "shared";
        } catch (error: unknown) {
            const err = error as { name?: string };
            if (err?.name === "AbortError") {
                return "cancelled";
            }

            console.error(
                "Failed to share via Web Share API, falling back:",
                error,
            );
        }
    }

    const clipboardSuccess = await copyToClipboard(options.url);
    return clipboardSuccess ? "copied" : "failed";
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
        const buildData = resolveShareBuildData(buildName, customBuildData);
        const shareUrl = createShareUrl(buildData);
        const success = await copyShareUrl(shareUrl);
        return success;
    } catch (error) {
        console.error("Failed to save build URL:", error);
        return false;
    }
}

/**
 * Shares the current build as an image
 * Captures all three trees (Guardian, Vanguard, Cannon) and combines them horizontally
 * Exports as a transparent PNG and copies to clipboard
 */
let isShareImageProcessing = false;

export async function shareBuildAsImage(): Promise<void> {
    if (isShareImageProcessing) return;
    isShareImageProcessing = true;

    const showScreenshotToast = (success: boolean) => {
        showToast(
            success
                ? tr("share.shareScreenshotCopiedToast")
                : tr("share.unableToCopyScreenshotToast"),
            {
                tone: success ? "positive" : "negative",
            },
        );
    };

    try {
        // Capture all three trees (0=Guardian, 1=Vanguard, 2=Cannon)
        const { captureCombinedTreesImage } = await import("../buildImageExport/captureService");
        const combinedBlob = await captureCombinedTreesImage();

        if (!combinedBlob) {
            console.error("Failed to combine tree images");
            showScreenshotToast(false);
            return;
        }

        // Copy the combined image to clipboard
        const success = await copyImageBlobToClipboard(combinedBlob);
        showScreenshotToast(success);
    } catch (error) {
        console.error("Failed to share build as image:", error);
        showScreenshotToast(false);
    } finally {
        isShareImageProcessing = false;
    }
}

/**
 * Copies an image blob to clipboard
 * @param blob Image blob to copy
 * @returns Promise<boolean> true if successful
 */
export async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
        console.error("Clipboard API not available");
        return false;
    }

    try {
        const item = new ClipboardItem({ [EXPORT_MIME]: blob });
        await navigator.clipboard.write([item]);
        return true;
    } catch (error) {
        console.error("Failed to copy image to clipboard:", error);
        return false;
    }
}

/**
 * Result status for native share / clipboard-copy operations.
 * - "shared": Native share dialog succeeded.
 * - "copied": Content was copied to clipboard (fallback or explicit).
 * - "cancelled": User dismissed the native share dialog.
 * - "failed": All mechanisms failed.
 */
export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

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
}): Promise<ShareResult> {
    const buildData = resolveShareBuildData(
        options?.buildName,
        options?.customBuildData,
    );
    const shareUrl = createShareUrl(buildData);
    return shareUrlNative({
        url: shareUrl,
        title: options?.title,
        text: options?.text,
    });
}

/**
 * Downloads an image blob as a file
 */
export function downloadImageBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Shares an image blob via the native Web Share API,
 * falling back to copying the image to the clipboard.
 */
export async function shareImageBlobNative(
    blob: Blob,
    filename: string,
): Promise<ShareResult> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return "failed";
    }

    if (typeof navigator.share === "function") {
        try {
            const file = new File([blob], filename, { type: EXPORT_MIME });
            await navigator.share({ files: [file] });
            return "shared";
        } catch (error: unknown) {
            const err = error as { name?: string };
            if (err?.name === "AbortError") return "cancelled";
            console.error(
                "Failed to share image via Web Share API, falling back:",
                error,
            );
        }
    }

    const clipboardSuccess = await copyImageBlobToClipboard(blob);
    return clipboardSuccess ? "copied" : "failed";
}

/**
 * Shares text via the native Web Share API,
 * falling back to copying the text to the clipboard.
 */
export async function shareTextNative(text: string): Promise<ShareResult> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return "failed";
    }

    if (typeof navigator.share === "function") {
        try {
            await navigator.share({ text });
            return "shared";
        } catch (error: unknown) {
            const err = error as { name?: string };
            if (err?.name === "AbortError") return "cancelled";
            console.error(
                "Failed to share text via Web Share API, falling back:",
                error,
            );
        }
    }

    const clipboardSuccess = await copyToClipboard(text);
    return clipboardSuccess ? "copied" : "failed";
}
