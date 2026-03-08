import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
import type { Component } from "svelte";
import {
    type TranslateFn,
    openConfirmModal,
} from "./modalUtil";

/**
 * Opens the reset-tree confirmation modal. Use from ResetTreeButton and
 * from keyboard shortcut (e.g. Backspace) so modal copy and behavior stay in one place.
 */
export function openResetTreeModal(
    t: TranslateFn,
    treeLabel: string,
    onConfirm: () => void,
): void {
    const trimmedLabel = treeLabel.trim();
    const treeName = trimmedLabel
        ? t("trees.named", { label: trimmedLabel })
        : t("trees.generic");
    openConfirmModal(
        {
            title: trimmedLabel
                ? t("modal.resetTree.title", { treeName })
                : t("modal.resetTree.titleDefault"),
            message: t("modal.resetTree.message", { treeName }),
            confirmLabel: trimmedLabel
                ? t("modal.resetTree.confirmLabel", {
                      treeLabel: trimmedLabel,
                  })
                : t("modal.resetTree.confirmLabelDefault"),
            cancelLabel: t("common.cancel"),
            confirmNegative: true,
            titleIcon: ArrowCounterClockwiseIcon as unknown as Component,
        },
        onConfirm,
    );
}
