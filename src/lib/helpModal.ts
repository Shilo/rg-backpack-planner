import { HelpCircle } from "lucide-svelte";
import { openModal } from "./modalStore";
import packageInfo from "../../package.json";

type HelpModalOptions = {
  onClose?: () => void;
};

export function openHelpModal(options: HelpModalOptions = {}) {
  const ownerName = packageInfo?.author?.name ?? "Shilo";
  const ownerUrl = packageInfo?.author?.url ?? "https://github.com/shilo";
  const ownerLink = `<a href="${ownerUrl}" target="_blank" rel="noopener noreferrer">${ownerName}</a>`;
  openModal({
    type: "help",
    title: "",
    titleIcon: HelpCircle,
    message: `♛ Owner: ${ownerLink}`,
    actionsClass: "help-actions-opaque",
    confirmLabel: "Close",
    onConfirm: options.onClose,
    onCancel: options.onClose,
  });
}
