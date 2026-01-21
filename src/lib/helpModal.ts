import { HelpCircle } from "lucide-svelte";
import { openModal } from "./modalStore";

type HelpModalOptions = {
  onClose?: () => void;
};

export function openHelpModal(options: HelpModalOptions = {}) {
  openModal({
    type: "help",
    title: "Help",
    titleIcon: HelpCircle,
    confirmLabel: "Close",
    onConfirm: options.onClose,
    onCancel: options.onClose,
  });
}
