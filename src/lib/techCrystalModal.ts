import { get } from "svelte/store";
import { TechCrystalIcon } from "./customIcons";
import { openModal } from "./modalStore";
import { setTechCrystalsOwned, techCrystalsSpent } from "./techCrystalStore";
import { undoHistory } from "./undoHistoryStore";
import { t } from "svelte-whisper";
import { formatNumber } from "svelte-whisper";

export function openTechCrystalsOwnedModal(
    currentOwned: number,
    tooltipSubject?: string,
    activeTreeIndex: number = 0,
) {
    const defaultSubject = t("techCrystals.subjectYour");
    const normalizedSubject = tooltipSubject || defaultSubject;
    const currentSpent = get(techCrystalsSpent);
    openModal({
        type: "input",
        title: normalizedSubject !== defaultSubject
            ? t("techCrystals.ownedModalTitleWithSubject", {
                subject: normalizedSubject.charAt(0).toUpperCase() + normalizedSubject.slice(1),
            })
            : t("techCrystals.ownedModalTitle"),
        titleIcon: TechCrystalIcon,
        titleIconWeight: "fill",
        wide: true,
        input: {
            label: t("techCrystals.ownedModalInput", {
                subject: normalizedSubject,
            }),
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
