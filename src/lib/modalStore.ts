import type { ComponentType } from "svelte";
import type { IconWeight } from "phosphor-svelte";
import { writable } from "svelte/store";

export type ModalType = "confirm" | "input" | "textInput" | "loadBuild";

export type ModalInputConfig = {
    label: string;
    value: number;
    min?: number;
    step?: number;
};

export type TextInputConfig = {
    label: string;
    value: string;
    maxLength?: number;
    placeholder?: string;
};

export type ModalPayload = {
    type: ModalType;
    title: string;
    titleIcon?: ComponentType | null;
    titleIconClass?: string;
    titleIconWeight?: IconWeight;
    message?: string;
    confirmLabel?: string;
    confirmNegative?: boolean;
    confirmPositive?: boolean;
    cancelLabel?: string;
    input?: ModalInputConfig;
    textInput?: TextInputConfig;
    onConfirm?: (value?: string | number) => void;
    onCancel?: () => void;
};

export const modalStore = writable<ModalPayload | null>(null);

export function openModal(payload: ModalPayload) {
    modalStore.set(payload);
}

export function closeModal() {
    modalStore.set(null);
}
