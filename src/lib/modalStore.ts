import type { ComponentType } from "svelte";
import { writable } from "svelte/store";

export type ModalType = "confirm" | "input" | "loadBuild";

export type ModalInputConfig = {
  label: string;
  value: number;
  min?: number;
  step?: number;
};

export type ModalPayload = {
  type: ModalType;
  title: string;
  titleIcon?: ComponentType | null;
  titleIconClass?: string;
  message?: string;
  confirmLabel?: string;
  confirmNegative?: boolean;
  confirmPositive?: boolean;
  cancelLabel?: string;
  input?: ModalInputConfig;
  onConfirm?: (value?: number) => void;
  onCancel?: () => void;
};

export const modalStore = writable<ModalPayload | null>(null);

export function openModal(payload: ModalPayload) {
  modalStore.set(payload);
}

export function closeModal() {
  modalStore.set(null);
}
