// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - phosphor-svelte icons are valid Svelte components
import { EyeIcon } from "phosphor-svelte";
import { openModal } from "./modalStore";
import { tr } from "./i18n";

export function openLoadBuildModal(onLoaded?: () => void) {
    openModal({
        type: "loadBuild",
        title: tr("preview.loadModalTitle"),
        titleIcon: EyeIcon,
        message: tr("preview.loadModalMessage"),
        confirmLabel: tr("preview.loadModalConfirmLabel"),
        cancelLabel: tr("common.cancel"),
        onConfirm: () => {
            onLoaded?.();
        },
    });
}
