import { Hexagon } from "lucide-svelte";
import { openModal } from "./modalStore";
import { setTechCrystalsOwned } from "./techCrystalStore";

export function openTechCrystalsOwnedModal(currentOwned: number) {
  openModal({
    type: "input",
    title: "TECH CRYSTALS OWNED",
    titleIcon: Hexagon,
    titleIconClass: "modal-title-icon-filled",
    input: {
      label: "Set your budget",
      value: currentOwned,
      min: 0,
      step: 1,
    },
    confirmLabel: "Save",
    cancelLabel: "Cancel",
    onConfirm: (value) => {
      if (typeof value === "number") {
        setTechCrystalsOwned(value);
      }
    },
  });
}
