<script lang="ts">
    import {
        ArrowCounterClockwiseIcon,
        CaretDownIcon,
        CaretDoubleDownIcon,
        CaretDoubleUpIcon,
        CaretLineUpIcon,
        CaretUpIcon,
    } from "phosphor-svelte";
    import ContextMenu from "./ContextMenu.svelte";
    import NodeContextButton from "./NodeContextButton.svelte";
    import { formatNumber } from "./mathUtil";
    import { tierSize, nextTierTargetLevel } from "./tierLeveling";
    import type { Node, NodeIndex, SkillId } from "../types/tree";
    import { SKILL_NODE_ICONS } from "../config/skillNodeIcons";
    import { getSkillLevelInfo, getCostRange } from "../config/skillMetadata";
    import { t } from "svelte-whisper";

    export let nodeIndex: NodeIndex | null = null;
    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    export let onIncrementTier: ((index: NodeIndex) => void) | null = null;
    export let onReset: ((index: NodeIndex) => void) | null = null;
    export let onDecrement: ((index: NodeIndex) => void) | null = null;
    export let onDecrementBy10: ((index: NodeIndex) => void) | null = null;
    export let onIncrement: ((index: NodeIndex) => void) | null = null;
    export let onIncrementBy10: ((index: NodeIndex) => void) | null = null;
    export let level: number = 0;
    export let maxLevel: number = 0;
    export let isGlobalIncrementLocked = false;
    export let skillId: SkillId | null = null;

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

    $: actionCosts = (() => {
        if (!skillId) return null;
        const canUp = level < maxLevel;
        const canDown = level > 0;
        return {
            increment1: canUp
                ? getCostRange(skillId, level, Math.min(level + 1, maxLevel))
                : null,
            increment10: canUp
                ? getCostRange(skillId, level, Math.min(level + 10, maxLevel))
                : null,
            incrementTier: canUp
                ? getCostRange(skillId, level, tierTargetLevel)
                : null,
            decrement1: canDown
                ? getCostRange(skillId, Math.max(level - 1, 0), level)
                : null,
            decrement10: canDown
                ? getCostRange(skillId, Math.max(level - 10, 0), level)
                : null,
            reset: canDown ? getCostRange(skillId, 0, level) : null,
        };
    })();

    $: isSingleLevel = maxLevel <= 1;

    $: nodeIcon = skillId != null ? (SKILL_NODE_ICONS[skillId] ?? null) : null;

    const tickGradient = (max: number) => {
        if (max <= 1) return "";
        const size = Math.ceil(max / 5);
        const positions = [1, 2, 3, 4].map((t) => (t * size * 100) / max);
        const thickness = "2px";
        const color = "var(--bg-panel)";
        return positions
            .map(
                (p) =>
                    `linear-gradient(90deg, transparent calc(${p}% - ${thickness}), ${color} calc(${p}% - ${thickness}), ${color} calc(${p}% + ${thickness}), transparent calc(${p}% + ${thickness}))`,
            )
            .join(", ");
    };

    $: tickImage = tickGradient(maxLevel);
    $: totalTiers = maxLevel > 1 ? 5 : 1;
    $: completedTiers = (() => {
        if (maxLevel <= 0) return 0;
        if (maxLevel <= 1) return level > 0 ? 1 : 0;

        const size = tierSize(maxLevel as Node["maxLevel"]);
        if (size === 0) return 0;

        const completed = Math.floor(level / size);
        return Math.min(totalTiers, completed);
    })();
</script>

<ContextMenu
    {x}
    {y}
    {isOpen}
    title=""
    ariaLabel={skillId ? $t(`skills.${skillId}`) : "Node"}
    {onClose}
    anchorBelow={true}
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

        <div
            class="progress"
            style={`--tick-gradient:${tickImage}; --tick-thickness: 3px;`}
        >
            <div
                class="progress-fill"
                style={`width: ${maxLevel > 0 ? (level / maxLevel) * 100 : 0}%`}
            ></div>
            {#if tickImage}
                <div class="progress-ticks"></div>
            {/if}
        </div>

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
                icon={ArrowCounterClockwiseIcon}
                label={$t("nodeMenu.reset")}
                crystalValue={actionCosts?.reset ?? null}
                negative
                disabled={nodeIndex === null || level <= 0}
                toastMessage={nodeIndex !== null && onReset
                    ? $t("nodeMenu.resetToast")
                    : undefined}
                toastNegative
                onClick={() => {
                    if (nodeIndex !== null && onReset) onReset(nodeIndex);
                }}
            />
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
        background: var(--bg-raised, rgba(0, 0, 0, 0.2));
        border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
        border-radius: 6px;
        padding: var(--spacing-xs, 4px);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .node-icon-wrapper :global(svg) {
        width: 100%;
        height: 100%;
        opacity: 0.85;
        color: var(--accent-light, #fff);
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .info-header-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
    }

    .skill-name {
        font-size: var(--font-base, 1rem);
        font-weight: var(--weight-bold, bold);
        color: var(--text, #fff);
        letter-spacing: var(--tracking, normal);
        line-height: 1.2;
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    .bonus-display {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: 0;
    }

    .bonus-current {
        font-size: var(--font-sm, 0.875rem);
        font-weight: var(--weight-bold, bold);
        color: var(--text-muted, #aaa);
        font-variant-numeric: tabular-nums;
    }

    .bonus-arrow {
        font-size: var(--font-xs, 0.75rem);
        color: var(--text-disabled, #666);
    }

    .bonus-next {
        font-size: var(--font-sm, 0.875rem);
        font-weight: var(--weight-bold, bold);
        color: var(--accent-light, #0ff);
        font-variant-numeric: tabular-nums;
    }

    .skill-desc {
        margin-top: 4px;
        font-size: var(--font-xs, 0.75rem);
        color: var(--text-muted, #aaa);
        line-height: var(--leading, 1.4);
        width: 100%;
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    .skill-desc :global(strong) {
        color: var(--accent-light, #fff);
        font-weight: var(--weight-bold, bold);
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

    .progress {
        width: 100%;
        height: 8px;
        background: var(--bg-raised);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
        clip-path: inset(0 round 4px);
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-light));
        transition: width var(--ease);
        border-radius: 0;
    }

    .progress-ticks {
        position: absolute;
        inset: 0;
        background-image: var(--tick-gradient, none);
        pointer-events: none;
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
    }
</style>
