// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - phosphor-svelte icons are valid Svelte components
import { EyeIcon } from "phosphor-svelte";
import { openModal } from "./modalStore";

export function openLoadBuildModal(onLoaded?: () => void) {
    openModal({
        type: "loadBuild",
        title: "PREVIEW SHAREABLE BUILD",
        // Cast to any to satisfy TS ComponentType constraint
        titleIcon: EyeIcon as any,
        message:
            "Type link or build code. ▼ icon for recommended builds. (Preview is temporary and won't affect your current build.)",
        confirmLabel: "Preview build",
        cancelLabel: "Cancel",
        onConfirm: () => {
            onLoaded?.();
        },
    });
}
