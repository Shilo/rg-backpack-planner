import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
import type { Component } from "svelte";
import type { LevelsByIndex } from "../types/tree";
import {
    type TranslateFn,
    openConfirmModal,
} from "./modalUtil";
import { openModal } from "./modalStore";
import {
    buildResetTreeChoiceState,
    type ResetTreeChoiceId,
} from "./resetTreeChoiceModel";
import type { TreeBranchKey } from "./treeLevelsStore";

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

export function openResetTreeChoicesModal(
    t: TranslateFn,
    treeLabel: string,
    activeLevels: LevelsByIndex | null | undefined,
    handlers: {
        onResetBranch: (branch: TreeBranchKey) => void;
        onResetTree: () => void;
    },
    treeIcon: Component | null = null,
): void {
    const trimmedLabel = treeLabel.trim();
    const treeName = trimmedLabel
        ? t("trees.named", { label: trimmedLabel })
        : t("trees.generic");
    const choiceState = buildResetTreeChoiceState(activeLevels);
    const branchName = (branch: TreeBranchKey) =>
        t(`theme.colorNames.${branch}`);

    openModal({
        type: "resetTreeChoices",
        title: trimmedLabel
            ? t("modal.resetTree.title", { treeName })
            : t("modal.resetTree.titleDefault"),
        titleIcon: ArrowCounterClockwiseIcon as unknown as Component,
        sheetIcon: treeIcon ?? null,
        message: t("modal.resetTree.choiceMessage", { treeName }),
        cancelLabel: t("common.cancel"),
        resetTreeChoices: {
            choices: choiceState.choices.map((choice) => {
                if (choice.id === "tree") {
                    return {
                        id: choice.id,
                        label: t("modal.resetTree.choiceTreeLabel"),
                        description: choice.enabled
                            ? t("modal.resetTree.choiceTreeDescription")
                            : t("modal.resetTree.choiceTreeDescriptionEmpty"),
                        tone: "danger" as const,
                        disabled: !choice.enabled,
                    };
                }

                const branch = choice.branch ?? "orange";
                const name = branchName(branch);
                return {
                    id: choice.id,
                    label: t("modal.resetTree.choiceBranchLabel", {
                        branchName: name,
                    }),
                    description: choice.enabled
                        ? t("modal.resetTree.choiceBranchDescription", {
                              branchName: name,
                          })
                        : t("modal.resetTree.choiceBranchDescriptionEmpty"),
                    tone: branch,
                    disabled: !choice.enabled,
                };
            }),
        },
        onConfirm: (value?: string | number) => {
            const choiceId = value as ResetTreeChoiceId | undefined;
            if (choiceId === "tree") {
                handlers.onResetTree();
                return;
            }
            if (
                choiceId === "orange" ||
                choiceId === "blue" ||
                choiceId === "yellow"
            ) {
                handlers.onResetBranch(choiceId);
            }
        },
    });
}
