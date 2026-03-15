import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
import type { Component } from "svelte";
import { formatNumber } from "svelte-whisper";
import type { LevelsByIndex, Node } from "../types/tree";
import {
    calculateTreeBranchTechCrystalsSpent,
    calculateTreeTechCrystalsSpent,
} from "./techCrystalStore";
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

const REFUND_AMOUNT_TOKEN = "__amount__";

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
    treeNodes: Node[] = [],
    treeIcon: Component | null = null,
): void {
    const trimmedLabel = treeLabel.trim();
    const treeName = trimmedLabel
        ? t("trees.named", { label: trimmedLabel })
        : t("trees.generic");
    const choiceState = buildResetTreeChoiceState(activeLevels);
    const branchName = (branch: TreeBranchKey) =>
        t(`theme.colorNames.${branch}`);
    const branchRefunds: Record<TreeBranchKey, number> = {
        yellow: calculateTreeBranchTechCrystalsSpent(
            activeLevels,
            treeNodes,
            "yellow",
        ),
        orange: calculateTreeBranchTechCrystalsSpent(
            activeLevels,
            treeNodes,
            "orange",
        ),
        blue: calculateTreeBranchTechCrystalsSpent(activeLevels, treeNodes, "blue"),
    };
    const totalRefund = calculateTreeTechCrystalsSpent(activeLevels, treeNodes);

    const buildRefundDescription = (
        key:
            | "modal.resetTree.choiceBranchDescription"
            | "modal.resetTree.choiceTreeDescription",
        params: Record<string, string>,
        amount: number,
    ) => {
        const amountLabel = t("preview.techCrystalsDescription", {
            count: formatNumber(amount),
        });
        const description = t(key, {
            ...params,
            amount: amountLabel,
        });
        const tokenizedDescription = t(key, {
            ...params,
            amount: REFUND_AMOUNT_TOKEN,
        });
        const [descriptionPrefix = "", ...descriptionSuffixParts] =
            tokenizedDescription.split(REFUND_AMOUNT_TOKEN);

        return {
            description,
            descriptionPrefix,
            descriptionAmount: amountLabel,
            descriptionSuffix: descriptionSuffixParts.join(REFUND_AMOUNT_TOKEN),
        };
    };

    openModal({
        type: "resetTreeChoices",
        title: trimmedLabel
            ? t("modal.resetTree.title", { treeName })
            : t("modal.resetTree.titleDefault"),
        sheetIcon: treeIcon ?? null,
        message: t("modal.resetTree.choiceMessage", { treeName }),
        cancelLabel: t("common.cancel"),
        resetTreeChoices: {
            choices: choiceState.choices.map((choice) => {
                if (choice.id === "tree") {
                    const refundDescription = buildRefundDescription(
                        "modal.resetTree.choiceTreeDescription",
                        {},
                        totalRefund,
                    );
                    return {
                        id: choice.id,
                        label: t("modal.resetTree.choiceTreeLabel"),
                        ...refundDescription,
                        tone: "danger" as const,
                        disabled: !choice.enabled,
                    };
                }

                const branch = choice.branch ?? "orange";
                const name = branchName(branch);
                const refundDescription = buildRefundDescription(
                    "modal.resetTree.choiceBranchDescription",
                    { branchName: name },
                    branchRefunds[branch],
                );
                return {
                    id: choice.id,
                    label: t("modal.resetTree.choiceBranchLabel", {
                        branchName: name,
                    }),
                    ...refundDescription,
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
