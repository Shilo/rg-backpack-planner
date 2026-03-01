import { HexagonIcon } from "phosphor-svelte";
import { openModal } from "./modalStore";
import { setTechCrystalsOwned } from "./techCrystalStore";
import { tr } from "./i18n";

export function openTechCrystalsOwnedModal(
    currentOwned: number,
    tooltipSubject?: string,
) {
    const normalizedSubject = tooltipSubject || tr("techCrystals.subjectYour");
    openModal({
        type: "input",
        title: tooltipSubject
            ? tr("techCrystals.ownedModalTitleWithSubject", {
                  subject: normalizedSubject,
              })
            : tr("techCrystals.ownedModalTitle"),
        titleIcon: HexagonIcon,
        titleIconWeight: "fill",
        input: {
            label: tr("techCrystals.ownedModalInput", {
                subject: normalizedSubject,
            }),
            value: currentOwned,
            min: 0,
            step: 1,
        },
        confirmLabel: tr("common.save"),
        cancelLabel: tr("common.cancel"),
        onConfirm: (value) => {
            if (typeof value === "number") {
                setTechCrystalsOwned(value);
            }
        },
    });
}
