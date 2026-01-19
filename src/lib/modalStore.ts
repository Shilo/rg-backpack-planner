import type { ComponentType } from "svelte";
import { writable } from "svelte/store";

export type ModalType = "alert" | "confirm" | "help" | "input";

export type ModalInputConfig = {
  label: string;
  value: number;
  min?: number;
  step?: number;
  placeholder?: string;
};

export type ModalPayload = {
  type: ModalType;
  title: string;
  titleIcon?: ComponentType | null;
  message?: string;
  confirmLabel?: string;
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
