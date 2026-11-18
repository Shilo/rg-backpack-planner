import { get } from "svelte/store";
import { TechCrystalIcon } from "./customIcons";
import { openModal } from "./modalStore";
import { setTechCrystalsOwned, techCrystalsSpent } from "./techCrystalStore";
import { undoHistory } from "./undoHistoryStore";
import { t, formatNumber } from "svelte-whisper";
import { ownedModalInput, ownedModalTitle, type BuildSubject } from "./buildSubject";

export function openTechCrystalsOwnedModal(
    currentOwned: number,
    subject: BuildSubject = "your",
    activeTreeIndex: number = 0,
) {
    const currentSpent = get(techCrystalsSpent);
    openModal({
        type: "input",
        title: ownedModalTitle(subject),
        titleIcon: TechCrystalIcon,
        titleIconWeight: "fill",
        wide: true,
        input: {
            label: ownedModalInput(subject),
            labelDetail: formatNumber(currentOwned),
            labelDetailIcon: TechCrystalIcon,
            labelDetailIconWeight: "fill",
            value: currentOwned,
            min: 0,
            step: 1,
        },
        ...(currentSpent > 0 && {
            inputFooterButton: {
                label: formatNumber(currentSpent),
                value: currentSpent,
                icon: TechCrystalIcon,
                tooltip: t("techCrystals.setToSpentTooltip", {
                    amount: formatNumber(currentSpent),
                }),
            },
        }),
        onConfirm: (value) => {
            if (typeof value === "number") {
                setTechCrystalsOwned(value);
                undoHistory.pushSnapshot(activeTreeIndex);
            }
        },
    });
}
