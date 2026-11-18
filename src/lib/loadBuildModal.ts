import { EyeIcon } from "phosphor-svelte";
import type { Component } from "svelte";
import { openModal } from "./modalStore";
import { t } from "svelte-whisper";

export function openLoadBuildModal(onLoaded?: () => void) {
    openModal({
        type: "loadBuild",
        title: t("preview.loadModalTitle"),
        titleIcon: EyeIcon as unknown as Component,
        message: t("preview.loadModalMessage"),
        confirmLabel: t("preview.loadModalConfirmLabel"),
        cancelLabel: t("common.cancel"),
        onConfirm: () => {
            onLoaded?.();
        },
    });
}
