import type { Component } from "svelte";
import type { IconWeight } from "phosphor-svelte";
import { writable } from "svelte/store";
import type { ResetTreeChoiceId } from "./resetTreeChoiceModel";

export type ModalType =
    | "confirm"
    | "input"
    | "textInput"
    | "loadBuild"
    | "resetTreeChoices";

export type ModalInputConfig = {
    label: string;
    labelDetail?: string;
    labelDetailIcon?: Component;
    labelDetailIconWeight?: IconWeight;
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

export type InputFooterButtonConfig = {
    label: string;
    value: number;
    icon: Component;
    tooltip?: string;
};

export type ResetTreeChoiceConfig = {
    id: ResetTreeChoiceId;
    label: string;
    description: string;
    descriptionPrefix?: string;
    descriptionAmount?: string;
    descriptionSuffix?: string;
    tone: "orange" | "blue" | "yellow" | "danger";
    disabled?: boolean;
};

export type ResetTreeChoicesConfig = {
    choices: ResetTreeChoiceConfig[];
};

export type ModalPayload = {
    type: ModalType;
    title: string;
    titleIcon?: Component | null;
    sheetIcon?: Component | null;
    titleIconClass?: string;
    titleIconWeight?: IconWeight;
    message?: string;
    confirmLabel?: string;
    confirmNegative?: boolean;
    confirmPositive?: boolean;
    cancelLabel?: string;
    input?: ModalInputConfig;
    /** Optional bottom-left button: shows label + icon, submits with value when clicked. */
    inputFooterButton?: InputFooterButtonConfig;
    textInput?: TextInputConfig;
    resetTreeChoices?: ResetTreeChoicesConfig;
    /** Use a wider shell for modals that need more horizontal space. */
    wide?: boolean;
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
