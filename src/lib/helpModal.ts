import { HelpCircle } from "lucide-svelte";
import { openModal } from "./modalStore";

export function openHelpModal() {
  openModal({
    type: "help",
    title: "Help",
    titleIcon: HelpCircle,
    confirmLabel: "Close",
  });
}
