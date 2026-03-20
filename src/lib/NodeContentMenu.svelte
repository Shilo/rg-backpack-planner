<script lang="ts">
    import {
        ArrowCounterClockwiseIcon,
        CaretDownIcon,
        CaretDoubleDownIcon,
        CaretDoubleUpIcon,
        CaretLineDownIcon,
        CaretLineUpIcon,
        CaretUpIcon,
        Warning,
    } from "phosphor-svelte";
    import ContextMenu from "./ContextMenu.svelte";
    import NodeContextButton from "./NodeContextButton.svelte";
    import ProgressBar from "./ProgressBar.svelte";
    import Button from "./Button.svelte";
    import { TechCrystalIcon } from "./customIcons";
    import { formatNumber } from "svelte-whisper";
    import { tierSize, nextTierTargetLevel, previousTierTargetLevel } from "./tierLeveling";
    import { GLOBAL_LEVELED_LEAF_NODE_CAP } from "./globalLeafCap";
    import type {
        Node,
        NodeIndex,
        SkillId,
        LevelsByIndex,
    } from "../types/tree";
    import { SKILL_NODE_ICONS } from "../config/skillNodeIcons";
    import { getSkillLevelInfo } from "../config/skillMetadata";
    import { t } from "svelte-whisper";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import { computeTotalCost } from "./nodeActionPreview";
    import { nodeLevelBehavior } from "./nodeLevelBehaviorStore";

    export let nodeIndex: NodeIndex | null = null;
    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    export let onIncrementTier: ((index: NodeIndex) => void) | null = null;
    export let onDecrementTier: ((index: NodeIndex) => void) | null = null;
    export let onReset: ((index: NodeIndex) => void) | null = null;
    export let onDecrement: ((index: NodeIndex) => void) | null = null;
    export let onDecrementBy10: ((index: NodeIndex) => void) | null = null;
    export let onIncrement: ((index: NodeIndex) => void) | null = null;
    export let onIncrementBy10: ((index: NodeIndex) => void) | null = null;
    export let level: number = 0;
    export let maxLevel: number = 0;
    export let isGlobalIncrementLocked = false;
    export let skillId: SkillId | null = null;

    const treeData =
        getContext<Writable<{ nodes: Node[]; levels: LevelsByIndex }>>("tree");

    function formatBonusValue(v: number): string {
        if (v === 0) return "0";
        if (Number.isInteger(v)) return formatNumber(v);
        return String(parseFloat(v.toPrecision(3)));
    }

    function parseDescription(text: string): string {
        if (!text) return "";
        return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    }

    $: levelInfo =
        skillId !== null ? getSkillLevelInfo(skillId, level, maxLevel) : null;
    $: tierTargetLevel =
        maxLevel > 0
            ? nextTierTargetLevel(level, maxLevel as Node["maxLevel"])
            : 0;
    $: previousTierLevel =
        maxLevel > 0
            ? previousTierTargetLevel(level, maxLevel as Node["maxLevel"])
            : 0;

    $: actionCosts = (() => {
        if (!skillId || nodeIndex === null) return null;
        const { nodes, levels } = $treeData;
        const behavior = $nodeLevelBehavior;
        const canUp = level < maxLevel;
        const canDown = level > 0;
        return {
            increment1: canUp
                ? computeTotalCost({
                      nodes,
                      levels,
                      index: nodeIndex,
                      targetLevel: Math.min(level + 1, maxLevel),
                      nodeLevelBehavior: behavior,
                  }).totalCost
                : null,
            increment10: canUp
                ? computeTotalCost({
                      nodes,
                      levels,
                      index: nodeIndex,
                      targetLevel: Math.min(level + 10, maxLevel),
                      nodeLevelBehavior: behavior,
                  }).totalCost
                : null,
            incrementTier: canUp
                ? computeTotalCost({
                      nodes,
                      levels,
                      index: nodeIndex,
                      targetLevel: tierTargetLevel,
                      nodeLevelBehavior: behavior,
                  }).totalCost
                : null,
            decrement1: canDown
                ? computeTotalCost({
                      nodes,
                      levels,
                      index: nodeIndex,
                      targetLevel: Math.max(level - 1, 0),
                      nodeLevelBehavior: behavior,
                  }).totalCost
                : null,
            decrement10: canDown
                ? computeTotalCost({
                      nodes,
                      levels,
                      index: nodeIndex,
                      targetLevel: Math.max(level - 10, 0),
                      nodeLevelBehavior: behavior,
                  }).totalCost
                : null,
            decrementTier: canDown
                ? computeTotalCost({
                      nodes,
                      levels,
                      index: nodeIndex,
                      targetLevel: previousTierLevel,
                      nodeLevelBehavior: behavior,
                  }).totalCost
                : null,
            reset: canDown
                ? computeTotalCost({
                      nodes,
                      levels,
                      index: nodeIndex,
                      targetLevel: 0,
                      nodeLevelBehavior: behavior,
                  }).totalCost
                : null,
        };
    })();

    $: isSingleLevel = maxLevel <= 1;

    $: decrementTierIsReset = previousTierLevel === 0;

    $: nodeIcon = skillId != null ? (SKILL_NODE_ICONS[skillId] ?? null) : null;

    $: totalTiers = maxLevel > 1 ? 5 : 1;
    $: completedTiers = (() => {
        if (maxLevel <= 0) return 0;
        if (maxLevel <= 1) return level > 0 ? 1 : 0;

        const size = tierSize(maxLevel as Node["maxLevel"]);
        if (size === 0) return 0;

        const completed = Math.floor(level / size);
        return Math.min(totalTiers, completed);
    })();

    $: showCapWarning =
        skillId === "final_damage_boost" &&
        level === 0 &&
        isGlobalIncrementLocked;
</script>

<ContextMenu
    {x}
    {y}
    {isOpen}
    title=""
    ariaLabel={skillId ? $t(`skills.${skillId}`) : "Node"}
    {onClose}
    anchorAbove={true}
>
    <div class="menu-content">
        <div class="info-header">
            {#if nodeIcon}
                <div class="node-icon-wrapper">
                    <svelte:component this={nodeIcon} />
                </div>
            {/if}
            <div class="info-header-text">
                <span class="skill-name"
                    >{skillId ? $t(`skills.${skillId}`) : "Node"}</span
                >
                {#if levelInfo}
                    <div class="bonus-display">
                        <span class="bonus-current"
                            >{formatBonusValue(
                                levelInfo.totalValue * 100,
                            )}%</span
                        >
                        {#if levelInfo.nextTotalValue !== null}
                            <span class="bonus-arrow">→</span>
                            <span class="bonus-next"
                                >{formatBonusValue(
                                    levelInfo.nextTotalValue * 100,
                                )}%</span
                            >
                        {/if}
                    </div>
                {/if}
            </div>
        </div>

        {#if showCapWarning}
            <div class="warning-row">
                <div class="warning-icon">
                    <Warning weight="bold" />
                </div>
                <span class="warning-text">
                    {$t("nodeMenu.leveledLeafCapWarning", {
                        cap: GLOBAL_LEVELED_LEAF_NODE_CAP,
                    })}
                </span>
            </div>
        {/if}

        {#if skillId && $t(`skillsDesc.${skillId}`)}
            <div class="skill-desc">
                {@html parseDescription($t(`skillsDesc.${skillId}`))}
            </div>
        {/if}

        <div class="meta-row">
            <div class="meta-item">
                <span class="meta-label">{$t("nodeMenu.level")}</span>
                <span class="meta-value"
                    >{formatNumber(level)}<span class="meta-sep">/</span
                    >{formatNumber(maxLevel)}</span
                >
            </div>
            <div class="meta-item">
                <span class="meta-label">{$t("nodeMenu.tier")}</span>
                <span class="meta-value"
                    >{completedTiers}<span class="meta-sep">/</span
                    >{totalTiers}</span
                >
            </div>
        </div>

        <ProgressBar value={maxLevel > 0 ? level / maxLevel : 0} {maxLevel} />

        <div class="button-grid" class:stacked={isSingleLevel}>
            {#if !isSingleLevel}
                <NodeContextButton
                    icon={CaretUpIcon}
                    label={$t("nodeMenu.incrementOne")}
                    crystalValue={actionCosts?.increment1 ?? null}
                    positive
                    disabled={nodeIndex === null ||
                        level >= maxLevel ||
                        isGlobalIncrementLocked}
                    onClick={() => {
                        if (nodeIndex !== null && onIncrement)
                            onIncrement(nodeIndex);
                    }}
                />
                <NodeContextButton
                    icon={CaretDoubleUpIcon}
                    label={$t("nodeMenu.incrementTen")}
                    crystalValue={actionCosts?.increment10 ?? null}
                    positive
                    disabled={nodeIndex === null ||
                        level >= maxLevel ||
                        isGlobalIncrementLocked}
                    onClick={() => {
                        if (nodeIndex !== null && onIncrementBy10)
                            onIncrementBy10(nodeIndex);
                    }}
                />
            {/if}
            <NodeContextButton
                icon={CaretLineUpIcon}
                label={tierTargetLevel >= maxLevel
                    ? $t("nodeMenu.max")
                    : $t("nodeMenu.incrementTier")}
                crystalValue={actionCosts?.incrementTier ?? null}
                positive
                disabled={nodeIndex === null ||
                    level >= maxLevel ||
                    isGlobalIncrementLocked}
                onClick={() => {
                    if (nodeIndex !== null && onIncrementTier)
                        onIncrementTier(nodeIndex);
                }}
            />
            {#if !isSingleLevel}
                <NodeContextButton
                    icon={CaretDownIcon}
                    label={$t("nodeMenu.decrementOne")}
                    crystalValue={actionCosts?.decrement1 ?? null}
                    negative
                    disabled={nodeIndex === null || level <= 0}
                    onClick={() => {
                        if (nodeIndex !== null && onDecrement)
                            onDecrement(nodeIndex);
                    }}
                />
                <NodeContextButton
                    icon={CaretDoubleDownIcon}
                    label={$t("nodeMenu.decrementTen")}
                    crystalValue={actionCosts?.decrement10 ?? null}
                    negative
                    disabled={nodeIndex === null || level <= 0}
                    onClick={() => {
                        if (nodeIndex !== null && onDecrementBy10)
                            onDecrementBy10(nodeIndex);
                    }}
                />
            {/if}
            <NodeContextButton
                icon={decrementTierIsReset ? ArrowCounterClockwiseIcon : CaretLineDownIcon}
                label={decrementTierIsReset
                    ? $t("nodeMenu.reset")
                    : $t("nodeMenu.decrementTier")}
                crystalValue={actionCosts?.decrementTier ?? null}
                negative
                disabled={nodeIndex === null || level <= 0}
                onClick={() => {
                    if (nodeIndex !== null && onDecrementTier)
                        onDecrementTier(nodeIndex);
                }}
            />
        </div>
        <div class="reset-wrapper" class:reset-hidden={decrementTierIsReset}>
            <Button
                ghost
                negative
                small
                icon={ArrowCounterClockwiseIcon}
                iconSize={16}
                disabled={nodeIndex === null || level <= 0}
                toastMessage={nodeIndex !== null && onReset
                    ? $t("nodeMenu.resetToast")
                    : undefined}
                on:click={() => {
                    if (nodeIndex !== null && onReset) onReset(nodeIndex);
                }}
            >
                {$t("nodeMenu.reset")}{#if actionCosts?.reset != null}<span class="reset-crystal"><TechCrystalIcon weight="fill" size={12} aria-hidden={true} /> +{formatNumber(actionCosts.reset)}</span>{/if}
            </Button>
        </div>
    </div>
</ContextMenu>

<style>
    .menu-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        width: min-content;
        align-items: stretch;
    }

    .info-header {
        display: flex;
        gap: var(--spacing-md);
        align-items: center;
        width: 100%;
    }

    .node-icon-wrapper {
        width: 3rem;
        height: 3rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-raised);
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
        padding: var(--spacing-xs);
        box-shadow: var(--shadow-inset);
    }

    .node-icon-wrapper :global(svg) {
        width: 100%;
        height: 100%;
        opacity: 0.85;
        color: var(--accent-light);
        filter: var(--shadow-drop-icon);
    }

    .info-header-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: var(--spacing-sm);
    }

    .skill-name {
        font-size: var(--font-base);
        font-weight: var(--weight-bold);
        color: var(--text);
        letter-spacing: var(--tracking);
        line-height: 1.2;
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    .bonus-display {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: 0;
    }

    .bonus-current {
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
    }

    .bonus-arrow {
        font-size: var(--font-xs);
        color: var(--text-disabled);
    }

    .bonus-next {
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        color: var(--accent-light);
        font-variant-numeric: tabular-nums;
    }

    .skill-desc {
        margin-top: 4px;
        font-size: var(--font-sm);
        color: var(--text-muted);
        line-height: var(--leading);
        width: 100%;
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    .skill-desc :global(strong) {
        color: var(--accent-light);
        font-weight: var(--weight-bold);
    }

    .warning-row {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--danger-bg);
        border: 1px solid var(--danger-border);
        border-radius: 6px;
        width: 100%;
        box-sizing: border-box;
    }

    .warning-icon {
        color: var(--accent-danger);
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 2px;
    }

    .warning-icon :global(svg) {
        width: 100%;
        height: 100%;
    }

    .warning-text {
        flex: 1;
        font-size: var(--font-sm);
        color: var(--danger-text);
        line-height: 1.4;
        font-weight: var(--weight-medium);
        word-break: break-word;
        white-space: normal;
        min-width: 0;
    }

    .meta-row {
        display: flex;
        justify-content: space-between;
        gap: var(--spacing-lg);
        width: 100%;
    }

    .meta-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .meta-label {
        font-size: var(--font-sm);
        color: var(--text-muted);
    }

    .meta-value {
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        color: var(--text);
    }

    .meta-sep {
        opacity: var(--opacity-disabled);
        margin: 0 1px;
    }

    .button-grid {
        display: grid;
        width: max-content;
        grid-template-columns:
            minmax(8.5ch, 1fr)
            minmax(calc(10ch - 5px), max-content)
            minmax(calc(10ch + 5px), max-content);
        gap: var(--spacing-md);
    }

    .button-grid.stacked {
        grid-template-columns: 1fr;
        min-width: 15rem;
    }

    .reset-wrapper :global(.button) {
        width: 100%;
    }

    .reset-wrapper.reset-hidden {
        visibility: hidden;
        pointer-events: none;
    }

    .reset-crystal {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        margin-left: var(--spacing-sm);
        color: var(--success-text);
        font-variant-numeric: tabular-nums;
    }

    .reset-crystal :global(svg) {
        color: var(--success-text);
    }
</style>
