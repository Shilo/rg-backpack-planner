import { writable } from "svelte/store";
import { truncateText } from "./stringUtil";
import { DEFAULT_PRESET_NAME } from "./buildPresetsStore";
import { tr } from "svelte-whisper";
import { getDisplayPresetName } from "./i18n";
import { sessionGetItem, sessionRemoveItem, sessionSetItem } from "./storage";

export type ToastTone = "positive" | "negative";

export type ToastAction = {
    label: string;
    onClick: () => void;
};

export type Toast = {
    id: string;
    message: string;
    tone: ToastTone;
    durationMs: number;
    showIcon: boolean;
    showSpinner: boolean;
    action?: ToastAction;
    key?: string;
};

type ToastOptions = Partial<
    Pick<Toast, "tone" | "durationMs" | "showIcon" | "showSpinner" | "action" | "key">
>;

const DEFAULT_DURATION_MS = 2600;

function createId() {
    return `toast-${Math.random().toString(36).slice(2, 10)}`;
}

export const toastStore = writable<Toast[]>([]);
export const toastsPaused = writable(false);
export const suppressedExitIds = new Set<string>();

export function showToast(
    message: string,
    options?: ToastOptions,
) {
    const key = options?.key;
    const toast: Toast = {
        id: createId(),
        message,
        tone: options?.tone ?? "positive",
        durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
        showIcon: options?.showIcon ?? true,
        showSpinner: options?.showSpinner ?? false,
        action: options?.action,
        key,
    };
    toastStore.update((toasts) => {
        const existing = toasts.find(
            (t) => t.message === message || (key && t.key === key),
        );
        if (existing) suppressedExitIds.add(existing.id);
        const deduped = existing
            ? toasts.filter((t) => t.id !== existing.id)
            : toasts;
        const updated = [...deduped, toast];
        return updated.slice(-3); // Keep only the last 3 toasts
    });
    return toast.id;
}

export function dismissToast(id: string) {
    toastStore.update((toasts) => toasts.filter((toast) => toast.id !== id));
}

/**
 * Shows a toast message after a 100ms delay.
 * Useful for showing toasts after UI initialization or page reloads.
 * @param message The toast message to display
 * @param options Optional toast options (tone, durationMs)
 */
export function showToastDelayed(
    message: string,
    options?: ToastOptions,
): void {
    setTimeout(() => {
        showToast(message, options);
    }, 100);
}

/**
 * Checks sessionStorage for a key, and if it exists, removes it and shows a toast.
 * Useful for showing toasts after page reloads (e.g., after cloning a build or stopping preview).
 * @param storageKey The storage key suffix (e.g. "stopped-preview-toast")
 * @param toastMessage Arrow function that receives the stored value and returns the toast message
 * @returns true if the key was found and processed, false otherwise
 */
export function checkSessionStorageAndShowToast(
    storageKey: string,
    toastMessage: (value: string) => string,
): boolean {
    const value = sessionGetItem(storageKey);
    if (value === null) return false;

    sessionRemoveItem(storageKey);
    showToastDelayed(toastMessage(value));
    return true;
}

const CLONED_BUILD_KEY = "cloned-build-toast";

/**
 * Checks sessionStorage for cloned build flag and shows toast.
 * @returns true if the flag was found and processed, false otherwise
 */
export function tryShowClonedBuildToast(): boolean {
    return checkSessionStorageAndShowToast(CLONED_BUILD_KEY, (previewName) =>
        previewName
            ? tr("preview.clonedBuildToast", {
                  name: truncateText(getDisplayPresetName(previewName)),
              })
            : tr("preview.clonedPreviewBuildToast"),
    );
}

/**
 * Queues a cloned build toast to be shown on next page load.
 * Sets the preview name in sessionStorage that will be checked after reload.
 * @param previewName The name of the preview build that was cloned (or empty string if not available)
 */
export function queueClonedBuildToast(previewName: string = ""): void {
    sessionSetItem(CLONED_BUILD_KEY, previewName);
}
