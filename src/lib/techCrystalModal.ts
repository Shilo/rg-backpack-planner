import { HexagonIcon } from "phosphor-svelte";
import { openModal } from "./modalStore";
import { setTechCrystalsOwned } from "./techCrystalStore";

export function openTechCrystalsOwnedModal(
    currentOwned: number,
    tooltipSubject?: string,
) {
    openModal({
        type: "input",
        title: tooltipSubject
            ? `TECH CRYSTALS OWNED (${tooltipSubject})`
            : "TECH CRYSTALS OWNED",
        titleIcon: HexagonIcon,
        titleIconWeight: "fill",
        input: {
            label: `Set ${tooltipSubject || "your"} budget`,
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
