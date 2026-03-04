<script lang="ts">
    import type { Component } from "svelte";
    import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { openModal } from "../modalStore";
    import { sumLevels } from "../treeLevelsStore";
    import type { LevelsByIndex } from "../../types/tree";
    import { t } from "svelte-whisper";

    export let onReset: (() => void) | null = null;
    export let onPress: (() => void) | null = null;
    export let levelsById: LevelsByIndex | null = null;
    export let treeLabel = "";

    $: totalLevels = levelsById ? sumLevels(levelsById) : null;
    $: disabled = !onReset || (totalLevels !== null && totalLevels === 0);
    $: trimmedTreeLabel = treeLabel.trim();
    $: treeName = trimmedTreeLabel
        ? $t("trees.named", { label: trimmedTreeLabel })
        : $t("trees.generic");
    $: modalTitle = trimmedTreeLabel
        ? $t("modal.resetTree.title", { treeName })
        : $t("modal.resetTree.titleDefault");
    $: confirmText = trimmedTreeLabel
        ? $t("modal.resetTree.confirmLabel", { treeLabel: trimmedTreeLabel })
        : $t("modal.resetTree.confirmLabelDefault");
    $: buttonText = trimmedTreeLabel
        ? $t("modal.resetTree.buttonLabel", { treeName })
        : $t("modal.resetTree.buttonLabelDefault");

    const handleReset = () => {
        if (!onReset) return;
        openModal({
            type: "confirm",
            title: modalTitle,
            titleIcon: ArrowCounterClockwiseIcon as unknown as Component,
            message: $t("modal.resetTree.message", { treeName }),
            confirmLabel: confirmText,
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            onConfirm: () => {
                onReset();
            },
        });
        queueMicrotask(() => {
            onPress?.();
        });
    };
</script>

<Button
    on:click={handleReset}
    tooltipText={$t("modal.resetTree.message", { treeName })}
    icon={ArrowCounterClockwiseIcon}
    arrow="right"
    negative
    {disabled}
>
    {buttonText}
</Button>
