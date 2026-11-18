import { t, type Translate } from "svelte-whisper";
import { truncateText } from "./stringUtil";

/** Whose build a sentence talks about: the user's own, the previewed one, or a named preset. */
export type BuildSubject = "your" | "preview" | { name: string };

// Each sentence is a whole translation per subject, never "your" + "budget" fragments,
// because word order and particles differ between languages.
// Components without runes pass `$t` as `translate` so Svelte re-renders on a language switch.

export function changeOwnedTooltip(subject: BuildSubject, translate: Translate = t): string {
    if (typeof subject === "object") return translate("techCrystals.changeOwnedTooltip.named", { name: subject.name });
    return subject === "preview"
        ? translate("techCrystals.changeOwnedTooltip.preview")
        : translate("techCrystals.changeOwnedTooltip.your");
}

export function ownedModalTitle(subject: BuildSubject, translate: Translate = t): string {
    if (typeof subject === "object") return translate("techCrystals.ownedModalTitle.named", { name: subject.name });
    return subject === "preview"
        ? translate("techCrystals.ownedModalTitle.preview")
        : translate("techCrystals.ownedModalTitle.your");
}

export function ownedModalInput(subject: BuildSubject, translate: Translate = t): string {
    if (typeof subject === "object") return translate("techCrystals.ownedModalInput.named", { name: subject.name });
    return subject === "preview"
        ? translate("techCrystals.ownedModalInput.preview")
        : translate("techCrystals.ownedModalInput.your");
}

export function shareTooltip(subject: BuildSubject, translate: Translate = t): string {
    if (typeof subject === "object") return translate("share.shareTooltip.named", { name: truncateText(subject.name) });
    return subject === "preview" ? translate("share.shareTooltip.preview") : translate("share.shareTooltip.your");
}
