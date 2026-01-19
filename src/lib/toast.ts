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
  toastStore.update((toasts) => [...toasts, toast]);
  return toast.id;
}

export function dismissToast(id: string) {
  toastStore.update((toasts) => toasts.filter((toast) => toast.id !== id));
}
