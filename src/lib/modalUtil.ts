import type { Component } from "svelte";
import { openModal } from "./modalStore";

/**
 * Translation function used by modal and other i18n-aware utils.
 * Compatible with svelte-whisper's t() and similar.
 */
export type TranslateFn = (
    key: string,
    opts?: Record<string, string>,
) => string;

export type ConfirmModalOptions = {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    confirmNegative?: boolean;
    titleIcon?: Component | null;
};

/**
 * Opens a confirm modal with the given options and callback.
 * Use from resetTreeModal, resetSettings, delete preset, or any other confirm flow.
 */
export function openConfirmModal(
    options: ConfirmModalOptions,
    onConfirm: () => void,
): void {
    openModal({
        type: "confirm",
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        confirmNegative: options.confirmNegative ?? false,
        titleIcon: options.titleIcon ?? null,
        onConfirm,
    });
}
