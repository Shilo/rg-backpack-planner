import { t } from "svelte-whisper";
import { truncateText } from "./stringUtil";

/** Whose build a sentence talks about: the user's own, the previewed one, or a named preset. */
export type BuildSubject = "your" | "preview" | { name: string };

// Each sentence is a whole translation per subject, never "your" + "budget" fragments,
// because word order and particles differ between languages.

export function changeOwnedTooltip(subject: BuildSubject): string {
    if (typeof subject === "object") return t("techCrystals.changeOwnedTooltip.named", { name: subject.name });
    return subject === "preview"
        ? t("techCrystals.changeOwnedTooltip.preview")
        : t("techCrystals.changeOwnedTooltip.your");
}

export function ownedModalTitle(subject: BuildSubject): string {
    if (typeof subject === "object") return t("techCrystals.ownedModalTitle.named", { name: subject.name });
    return subject === "preview"
        ? t("techCrystals.ownedModalTitle.preview")
        : t("techCrystals.ownedModalTitle.your");
}

export function ownedModalInput(subject: BuildSubject): string {
    if (typeof subject === "object") return t("techCrystals.ownedModalInput.named", { name: subject.name });
    return subject === "preview"
        ? t("techCrystals.ownedModalInput.preview")
        : t("techCrystals.ownedModalInput.your");
}

export function shareTooltip(subject: BuildSubject): string {
    if (typeof subject === "object") return t("share.shareTooltip.named", { name: truncateText(subject.name) });
    return subject === "preview" ? t("share.shareTooltip.preview") : t("share.shareTooltip.your");
}
