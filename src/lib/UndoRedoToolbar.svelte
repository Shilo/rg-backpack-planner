<script lang="ts">
    import { tick } from "svelte";
    import {
        ArrowArcLeftIcon,
        ArrowArcRightIcon,
        ArrowCounterClockwiseIcon,
    } from "phosphor-svelte";
    import type { LevelsByIndex, Node } from "../types/tree";
    import Button from "./Button.svelte";
    import { undoHistory, canUndo, canRedo } from "./undoHistoryStore";
    import { openResetTreeChoicesModal } from "./resetTreeModal";
    import { getTreeIcon } from "./customIcons";
    import { sumLevels, type TreeBranchKey } from "./treeLevelsStore";
    import { t } from "svelte-whisper";
    import { getKeyboardActionLabel } from "./input";

    export let onUndo: ((activeTreeIndex: number) => void) | null = null;
    export let onRedo: ((activeTreeIndex: number) => void) | null = null;
    export let onReset: (() => void) | null = null;
    export let onResetBranch: ((branch: TreeBranchKey) => void) | null = null;
    export let activeLevels: LevelsByIndex | null = null;
    export let treeNodes: Node[] = [];
    export let treeLabel = "";
    export let treeId = "";
    export let activeTreeIndex = 0;
    export let forceShow = false;

    /** Half of Tree.svelte's `in:fade` duration — enough for tree to be visible */
    const TREE_FADE_MS = 150;

    $: trimmedTreeLabel = treeLabel.trim();
    $: treeName = trimmedTreeLabel
        ? $t("trees.named", { label: trimmedTreeLabel })
        : $t("trees.generic");
    $: activeTreeLevelsTotal = sumLevels(activeLevels);
    $: canResetTree = activeTreeLevelsTotal > 0 && !!onReset && !!onResetBranch;
    $: treeIcon = getTreeIcon(treeId);
    $: keyUndo = getKeyboardActionLabel("undo", $t);
    $: keyRedo = getKeyboardActionLabel("redo", $t);
    $: keyBack = getKeyboardActionLabel("back", $t);
    $: showUndoRedo = $canUndo || $canRedo || forceShow;
    $: showToolbar = showUndoRedo || canResetTree || forceShow;

    let applyGeneration = 0;

    function waitForFrame(): Promise<void> {
        return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    function waitForFade(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, TREE_FADE_MS));
    }

    async function handleUndo() {
        const result = undoHistory.undoDeferred();
        if (result == null) return;
        const switchedTab = result.activeTreeIndex !== activeTreeIndex;
        onUndo?.(result.activeTreeIndex);
        const gen = ++applyGeneration;
        await tick();
        if (switchedTab) {
            await waitForFade();
        } else {
            await waitForFrame();
        }
        if (gen !== applyGeneration) return;
        result.apply();
    }

    async function handleRedo() {
        const result = undoHistory.redoDeferred();
        if (result == null) return;
        const switchedTab = result.activeTreeIndex !== activeTreeIndex;
        onRedo?.(result.activeTreeIndex);
        const gen = ++applyGeneration;
        await tick();
        if (switchedTab) {
            await waitForFade();
        } else {
            await waitForFrame();
        }
        if (gen !== applyGeneration) return;
        result.apply();
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

{#if showToolbar}
    <div class="undo-redo-toolbar">
        {#if showUndoRedo}
            <div class="undo-redo-toolbar__group">
                <Button
                    class="undo-redo-toolbar__btn"
                    aria-label={$t("common.undo")}
                    tooltipText={$t("common.undo")}
                    shortcut={keyUndo}
                    icon={ArrowArcLeftIcon}
                    small
                    disabled={!$canUndo}
                    flashOnAction="undo"
                    on:click={handleUndo}
                />
                <Button
                    class="undo-redo-toolbar__btn"
                    aria-label={$t("common.redo")}
                    tooltipText={$t("common.redo")}
                    shortcut={keyRedo}
                    icon={ArrowArcRightIcon}
                    small
                    disabled={!$canRedo}
                    flashOnAction="redo"
                    on:click={handleRedo}
                />
                <span class="undo-redo-toolbar__divider"></span>
            </div>
        {/if}
        <Button
            class="undo-redo-toolbar__btn"
            aria-label={$t("modal.resetTree.optionsLabel", { treeName })}
            tooltipText={$t("modal.resetTree.optionsLabel", { treeName })}
            shortcut={keyBack}
            icon={ArrowCounterClockwiseIcon}
            iconClass="undo-redo-toolbar__icon-reset"
            small
            disabled={!canResetTree}
            on:click={handleReset}
        />
    </div>
{/if}

<style>
    .undo-redo-toolbar {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius-full);
        padding: 0;
        height: 38px;
    }

    .undo-redo-toolbar__group {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .undo-redo-toolbar__divider {
        width: 1px;
        height: 20px;
        background: var(--border);
        margin: 0 var(--spacing-sm);
    }

    :global(.undo-redo-toolbar__btn) {
        border-radius: var(--radius-full) !important;
        border: none !important;
        background: transparent !important;
        padding: var(--spacing-md) !important;
    }

    :global(.undo-redo-toolbar__btn:not(:disabled):hover),
    :global(.undo-redo-toolbar__btn:not(:disabled):active),
    :global(.undo-redo-toolbar__btn.button-flash:not(:disabled)) {
        background: var(--bg-input) !important;
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
