<script lang="ts">
    import { ArrowArcLeftIcon, ArrowArcRightIcon, TrashSimpleIcon } from "phosphor-svelte";
    import type { LevelsByIndex, Node } from "../types/tree";
    import Button from "./Button.svelte";
    import { undoHistory, canUndo, canRedo } from "./undoHistoryStore";
    import { openResetTreeChoicesModal } from "./resetTreeModal";
    import { getTreeIcon } from "./customIcons";
    import { sumLevels, type TreeBranchKey } from "./treeLevelsStore";
    import { t } from "svelte-whisper";

    export let onUndo: ((activeTreeIndex: number) => void) | null = null;
    export let onRedo: ((activeTreeIndex: number) => void) | null = null;
    export let onReset: (() => void) | null = null;
    export let onResetBranch: ((branch: TreeBranchKey) => void) | null = null;
    export let activeLevels: LevelsByIndex | null = null;
    export let treeNodes: Node[] = [];
    export let treeLabel = "";
    export let treeId = "";

    $: trimmedTreeLabel = treeLabel.trim();
    $: treeName = trimmedTreeLabel
        ? $t("trees.named", { label: trimmedTreeLabel })
        : $t("trees.generic");
    $: activeTreeLevelsTotal = sumLevels(activeLevels);
    $: canResetTree = activeTreeLevelsTotal > 0 && !!onReset && !!onResetBranch;
    $: treeIcon = getTreeIcon(treeId);

    function handleUndo() {
        const idx = undoHistory.undo();
        if (idx != null) onUndo?.(idx);
    }

    function handleRedo() {
        const idx = undoHistory.redo();
        if (idx != null) onRedo?.(idx);
    }

    function handleReset() {
        if (!canResetTree || !onReset || !onResetBranch) return;
        openResetTreeChoicesModal(
            $t,
            treeLabel,
            activeLevels,
            { onResetTree: onReset, onResetBranch },
            treeNodes,
            treeIcon,
        );
    }
</script>

<div class="undo-redo-toolbar">
    <Button
        class="undo-redo-toolbar__btn"
        aria-label="Undo"
        icon={ArrowArcLeftIcon}
        small
        disabled={!$canUndo}
        on:click={handleUndo}
    />
    <Button
        class="undo-redo-toolbar__btn"
        aria-label="Redo"
        icon={ArrowArcRightIcon}
        small
        disabled={!$canRedo}
        on:click={handleRedo}
    />
    <span class="undo-redo-toolbar__divider" />
    <Button
        class="undo-redo-toolbar__btn"
        aria-label={$t("modal.resetTree.optionsLabel", { treeName })}
        tooltipText={$t("modal.resetTree.optionsLabel", { treeName })}
        icon={TrashSimpleIcon}
        iconClass="undo-redo-toolbar__icon-reset"
        small
        disabled={!canResetTree}
        on:click={handleReset}
    />
</div>

<style>
    .undo-redo-toolbar {
        display: flex;
        align-items: center;
        gap: 2px;
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: 999px;
        padding: 0 3px;
    }

    .undo-redo-toolbar__divider {
        width: 1px;
        height: 20px;
        background: var(--border);
        margin: 0 1px;
    }

    :global(.undo-redo-toolbar__btn) {
        border-radius: 999px !important;
        border: none !important;
        background: transparent !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
    }

    :global(.undo-redo-toolbar__btn:not(:disabled):hover) {
        background: var(--bg-input) !important;
    }

    :global(.undo-redo-toolbar__btn:not(:disabled):active) {
        background: var(--bg-input) !important;
    }

    :global(.undo-redo-toolbar__btn:disabled) {
        background: transparent !important;
    }

    :global(.undo-redo-toolbar__icon-reset) {
        color: var(--accent-danger);
        opacity: 0.85;
    }

    :global(.undo-redo-toolbar__btn:disabled .undo-redo-toolbar__icon-reset) {
        color: var(--text-disabled);
        opacity: 0.5;
    }
</style>
