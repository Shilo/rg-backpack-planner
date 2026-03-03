import { EyeIcon } from "phosphor-svelte";
import type { Component } from "svelte";
import { openModal } from "./modalStore";

export function openLoadBuildModal(onLoaded?: () => void) {
    openModal({
        type: "loadBuild",
        title: "PREVIEW SHAREABLE BUILD",
        titleIcon: EyeIcon as unknown as Component,
        message:
            "Type link or build code. (Preview is temporary and won't affect your current build.)",
        confirmLabel: "Preview build",
        cancelLabel: "Cancel",
        onConfirm: () => {
            onLoaded?.();
        },
    });
}
