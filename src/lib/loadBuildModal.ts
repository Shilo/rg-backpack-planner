import { openModal } from "./modalStore";

export function openLoadBuildModal(onLoaded?: () => void) {
  openModal({
    type: "loadBuild",
    title: "LOAD SHAREABLE BUILD",
    message:
      "Paste a Backpack Planner link (https://...) or just the build code.",
    confirmLabel: "Load build",
    cancelLabel: "Cancel",
    onConfirm: () => {
      onLoaded?.();
    },
  });
}

