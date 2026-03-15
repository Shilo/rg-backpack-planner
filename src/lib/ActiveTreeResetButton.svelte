<script lang="ts">
    import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
    import type { LevelsByIndex } from "../types/tree";
    import Button from "./Button.svelte";
    import { openResetTreeChoicesModal } from "./resetTreeModal";
    import { sumLevels, type TreeBranchKey } from "./treeLevelsStore";
    import { t } from "svelte-whisper";

    export let onReset: (() => void) | null = null;
    export let onResetBranch: ((branch: TreeBranchKey) => void) | null = null;
    export let activeLevels: LevelsByIndex | null = null;
    export let treeLabel = "";

    $: trimmedTreeLabel = treeLabel.trim();
    $: treeName = trimmedTreeLabel
        ? $t("trees.named", { label: trimmedTreeLabel })
        : $t("trees.generic");
    $: activeTreeLevelsTotal = sumLevels(activeLevels);
    $: showReset = activeTreeLevelsTotal > 0 && !!onReset && !!onResetBranch;

    const handleReset = () => {
        if (!onReset || !onResetBranch) return;
        openResetTreeChoicesModal($t, treeLabel, activeLevels, {
            onResetTree: onReset,
            onResetBranch,
        });
    };
</script>

{#if showReset}
    <Button
        class="active-tree-reset"
        type="button"
        aria-label={$t("modal.resetTree.optionsLabel", { treeName })}
        tooltipText={$t("modal.resetTree.optionsLabel", { treeName })}
        icon={ArrowCounterClockwiseIcon}
        iconClass="active-tree-reset__icon"
        negative
        on:click={handleReset}
    />
{/if}

<style>
    :global(.active-tree-reset) {
        border-radius: 999px !important;
    }
</style>
