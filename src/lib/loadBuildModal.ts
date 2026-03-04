import { EyeIcon } from "phosphor-svelte";
import type { Component } from "svelte";
import { openModal } from "./modalStore";
import { tr } from "svelte-whisper";

export function openLoadBuildModal(onLoaded?: () => void) {
    openModal({
        type: "loadBuild",
        title: tr("preview.loadModalTitle"),
        titleIcon: EyeIcon as unknown as Component,
        message: tr("preview.loadModalMessage"),
        confirmLabel: tr("preview.loadModalConfirmLabel"),
        cancelLabel: tr("common.cancel"),
        onConfirm: () => {
            onLoaded?.();
        },
    });
}
