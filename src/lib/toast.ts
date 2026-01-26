import { writable } from "svelte/store";

export type ToastTone = "positive" | "negative";

export type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number;
};

const DEFAULT_DURATION_MS = 2600;

function createId() {
  return `toast-${Math.random().toString(36).slice(2, 10)}`;
}

export const toastStore = writable<Toast[]>([]);

export function showToast(
  message: string,
  options?: Partial<Pick<Toast, "tone" | "durationMs">>,
) {
  const toast: Toast = {
    id: createId(),
    message,
    tone: options?.tone ?? "positive",
    durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
  };
  toastStore.update((toasts) => {
    const updated = [...toasts, toast];
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
  options?: Partial<Pick<Toast, "tone" | "durationMs">>,
): void {
  setTimeout(() => {
    showToast(message, options);
  }, 100);
}

/**
 * Checks sessionStorage for a key, and if it equals "true", removes it and shows a toast.
 * Useful for showing toasts after page reloads (e.g., after cloning a build or stopping preview).
 * @param sessionStorageKey The sessionStorage key to check
 * @param toastMessage The message to show in the toast
 * @returns true if the key was found and processed, false otherwise
 */
export function checkSessionStorageAndShowToast(
  sessionStorageKey: string,
  toastMessage: string,
): boolean {
  if (typeof window === "undefined") return false;

  const value = sessionStorage.getItem(sessionStorageKey);
  if (value !== "true") return false;

  sessionStorage.removeItem(sessionStorageKey);
  showToastDelayed(toastMessage);
  return true;
}

const STOPPED_PREVIEW_KEY = "rg-backpack-planner-stopped-preview-toast";
const CLONED_BUILD_KEY = "rg-backpack-planner-cloned-build-toast";

/**
 * Checks sessionStorage for stopped preview flag and shows toast.
 * @returns true if the flag was found and processed, false otherwise
 */
export function tryShowStoppedPreviewToast(): boolean {
  return checkSessionStorageAndShowToast(
    STOPPED_PREVIEW_KEY,
    "Back to personal build",
  );
}

/**
 * Checks sessionStorage for cloned build flag and shows toast.
 * @returns true if the flag was found and processed, false otherwise
 */
export function tryShowClonedBuildToast(): boolean {
  return checkSessionStorageAndShowToast(
    CLONED_BUILD_KEY,
    "Cloned preview to personal build",
  );
}

/**
 * Queues a stopped preview toast to be shown on next page load.
 * Sets a flag in sessionStorage that will be checked after reload.
 */
export function queueStoppedPreviewToast(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STOPPED_PREVIEW_KEY, true.toString());
}

/**
 * Queues a cloned build toast to be shown on next page load.
 * Sets a flag in sessionStorage that will be checked after reload.
 */
export function queueClonedBuildToast(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CLONED_BUILD_KEY, true.toString());
}
