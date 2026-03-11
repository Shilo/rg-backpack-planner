import { get } from "svelte/store";
import { TechCrystalIcon } from "./customIcons";
import { openModal } from "./modalStore";
import { setTechCrystalsOwned, techCrystalsSpent } from "./techCrystalStore";
import { tr } from "svelte-whisper";
import { formatNumber } from "./mathUtil";

export function openTechCrystalsOwnedModal(
    currentOwned: number,
    tooltipSubject?: string,
) {
    const normalizedSubject = tooltipSubject || tr("techCrystals.subjectYour");
    const currentSpent = get(techCrystalsSpent);
    openModal({
        type: "input",
        title: tooltipSubject
            ? tr("techCrystals.ownedModalTitleWithSubject", {
                subject: normalizedSubject,
            })
            : tr("techCrystals.ownedModalTitle"),
        titleIcon: TechCrystalIcon,
        titleIconWeight: "fill",
        input: {
            label: tr("techCrystals.ownedModalInput", {
                subject: normalizedSubject,
            }),
            value: currentOwned,
            min: 0,
            step: 1,
        },
        ...(currentSpent > 0 && {
            inputFooterButton: {
                label: formatNumber(currentSpent),
                value: currentSpent,
                icon: TechCrystalIcon,
            },
        }),
        onConfirm: (value) => {
            if (typeof value === "number") {
                setTechCrystalsOwned(value);
            }
        },
    });
}
