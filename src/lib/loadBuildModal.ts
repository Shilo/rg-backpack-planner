// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - phosphor-svelte icons are valid Svelte components
import { ArrowSquareInIcon } from "phosphor-svelte";
import { openModal } from "./modalStore";

export function openLoadBuildModal(onLoaded?: () => void) {
  openModal({
    type: "loadBuild",
    title: "LOAD SHAREABLE BUILD",
    // Cast to any to satisfy TS ComponentType constraint
    titleIcon: ArrowSquareInIcon as any,
    message:
      "Paste a Backpack Planner link (https://...) or just the build code.",
    confirmLabel: "Load build",
    cancelLabel: "Cancel",
    onConfirm: () => {
      onLoaded?.();
    },
  });
}

