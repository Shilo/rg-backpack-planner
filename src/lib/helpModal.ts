import { openModal } from "./modalStore";
import packageInfo from "../../package.json";

type HelpModalOptions = {
  onClose?: () => void;
};

export function openHelpModal(options: HelpModalOptions = {}) {
  const ownerName = packageInfo.author.name;
  const ownerUrl = packageInfo.author.url;
  const gameName = packageInfo.game.name;
  const gameUrl = packageInfo.game.url;
  const ownerLink = `<a href="${ownerUrl}" target="_blank" rel="noopener noreferrer">${ownerName}</a>`;
  const gameLink = `<a href="${gameUrl}" target="_blank" rel="noopener noreferrer">${gameName}</a>`;
  openModal({
    type: "help",
    title: "",
    message: `For ${gameLink} - By ${ownerLink}`,
    actionsClass: "help-actions-opaque",
    confirmLabel: "Close",
    onConfirm: options.onClose,
    onCancel: options.onClose,
  });
}
