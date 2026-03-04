<script lang="ts">
    import {
        ArrowCounterClockwiseIcon,
        CaretDownIcon,
        CaretDoubleDownIcon,
        CaretDoubleUpIcon,
        CaretLineUpIcon,
        CaretUpIcon,
        CheckCircleIcon,
        CrownIcon,
        LockIcon,
        PlusIcon,
    } from "phosphor-svelte";
    import ContextMenu from "./ContextMenu.svelte";
    import NodeContextButton from "./NodeContextButton.svelte";
    import { formatNumber } from "./mathUtil";
    import { tierSize } from "./tierLeveling";
    import type { Node, NodeIndex, SkillId } from "../types/tree";
    import {
        getSkillLevelInfo,
        getSkillDescKey,
        getCostRange,
    } from "../config/skillMetadata";
    import { t } from "svelte-whisper";

    export let nodeIndex: NodeIndex | null = null;
    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    export let onMax: ((index: NodeIndex) => void) | null = null;
    export let onReset: ((index: NodeIndex) => void) | null = null;
    export let onDecrement: ((index: NodeIndex) => void) | null = null;
    export let onDecrementBy10: ((index: NodeIndex) => void) | null = null;
    export let onIncrement: ((index: NodeIndex) => void) | null = null;
    export let onIncrementBy10: ((index: NodeIndex) => void) | null = null;
    export let level: number = 0;
    export let maxLevel: number = 0;
    export let state: "locked" | "available" | "active" | "maxed" = "locked";
    export let skillId: SkillId | null = null;

    function formatBonusValue(v: number): string {
        if (v === 0) return "0";
        if (Number.isInteger(v)) return formatNumber(v);
        return String(parseFloat(v.toPrecision(3)));
    }

    $: levelInfo =
        skillId !== null ? getSkillLevelInfo(skillId, level, maxLevel) : null;
    $: descKey = skillId !== null ? getSkillDescKey(skillId) : null;

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
            max: canUp ? getCostRange(skillId, level, maxLevel) : null,
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

    const stateIcons = {
        locked: LockIcon,
        available: PlusIcon,
        active: CheckCircleIcon,
        maxed: CrownIcon,
    } as const;

    $: NodeIcon = stateIcons[state] ?? LockIcon;

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
    title={skillId ? $t(`skills.${skillId}`) : "Node"}
    ariaLabel="Node actions"
    {onClose}
>
    <div class="node-stats">
        <div class="node-icon-wrapper">
            <svelte:component this={NodeIcon} />
        </div>
        <div class="node-stats-content">
            {#if descKey}
                <p class="skill-description">{descKey}</p>
            {/if}
            {#if levelInfo}
                <div class="stat-row">
                    <span class="stat-label">{$t("nodeMenu.bonus")}</span>
                    <span class="stat-value">
                        {formatBonusValue(
                            levelInfo.totalValue * 100,
                        )}%{#if levelInfo.nextTotalValue !== null}&nbsp;→&nbsp;{formatBonusValue(
                                levelInfo.nextTotalValue * 100,
                            )}%{/if}
                    </span>
                </div>
                <div class="stat-row">
                    <span class="stat-label"
                        >{$t("nodeMenu.nextLevelCost")}</span
                    >
                    <span class="stat-value">
                        {levelInfo.costToNextLevel !== null
                            ? formatNumber(levelInfo.costToNextLevel)
                            : $t("nodeMenu.max")}
                    </span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">{$t("nodeMenu.totalSpent")}</span>
                    <span class="stat-value"
                        >{formatNumber(levelInfo.totalCostSpent)}</span
                    >
                </div>
            {/if}
            <div class="stat-row">
                <span class="stat-label">{$t("nodeMenu.level")}</span>
                <span class="stat-value"
                    >{formatNumber(level)} / {formatNumber(maxLevel)}</span
                >
            </div>
            <div class="stat-row">
                <span class="stat-label">{$t("nodeMenu.tier")}</span>
                <span class="stat-value">
                    {completedTiers}
                    /
                    {totalTiers}
                </span>
            </div>
            <div
                class="level-progress"
                style={`--tick-gradient:${tickImage}; --tick-thickness: 3px;`}
            >
                <div
                    class="level-progress-bar"
                    style={`width: ${maxLevel > 0 ? (level / maxLevel) * 100 : 0}%`}
                ></div>
                {#if tickImage}
                    <div class="level-progress-ticks"></div>
                {/if}
            </div>
        </div>
    </div>
    <div class="button-grid" class:stacked={isSingleLevel}>
        <NodeContextButton
            icon={isSingleLevel ? CaretLineUpIcon : CaretUpIcon}
            label={isSingleLevel ? $t("nodeMenu.max") : $t("nodeMenu.incrementOne")}
            crystalValue={actionCosts?.increment1 ?? null}
            positive
            disabled={nodeIndex === null || level >= maxLevel}
            onClick={() => {
                if (nodeIndex !== null && onIncrement) onIncrement(nodeIndex);
            }}
        />
        {#if !isSingleLevel}
            <NodeContextButton
                icon={CaretDoubleUpIcon}
                label={$t("nodeMenu.incrementTen")}
                crystalValue={actionCosts?.increment10 ?? null}
                positive
                disabled={nodeIndex === null || level >= maxLevel}
                onClick={() => {
                    if (nodeIndex !== null && onIncrementBy10)
                        onIncrementBy10(nodeIndex);
                }}
            />
            <NodeContextButton
                icon={CaretLineUpIcon}
                label={$t("nodeMenu.max")}
                crystalValue={actionCosts?.max ?? null}
                positive
                disabled={nodeIndex === null || level >= maxLevel}
                onClick={() => {
                    if (nodeIndex !== null && onMax) onMax(nodeIndex);
                }}
            />
        {/if}
        <NodeContextButton
            icon={isSingleLevel ? ArrowCounterClockwiseIcon : CaretDownIcon}
            label={isSingleLevel
                ? $t("nodeMenu.reset")
                : $t("nodeMenu.decrementOne")}
            crystalValue={actionCosts?.decrement1 ?? null}
            negative
            disabled={nodeIndex === null || level <= 0}
            onClick={() => {
                if (nodeIndex !== null && onDecrement) onDecrement(nodeIndex);
            }}
        />
        {#if !isSingleLevel}
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
        {/if}
    </div>
</ContextMenu>

<style>
    .node-stats {
        padding: var(--spacing-md) var(--spacing-lg);
        border-bottom: var(--border-width) solid var(--border-subtle);
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-lg);
    }

    .node-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        flex-shrink: 0;
    }

    .node-icon-wrapper :global(svg) {
        width: 24px;
        height: 24px;
        opacity: var(--opacity-disabled);
    }

    .node-stats-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }

    .skill-description {
        margin: 0;
        font-size: var(--font-sm);
        color: var(--text-muted);
        line-height: 1.4;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-md);
        font-size: var(--font-base);
    }

    .stat-label {
        color: var(--text-muted);
    }

    .stat-value {
        color: var(--text);
        font-weight: var(--weight-bold);
    }

    .level-progress {
        width: 100%;
        height: 10px;
        background: var(--bg-raised);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 2px;
        position: relative;
        clip-path: inset(0 round 4px);
    }

    .level-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-light));
        transition: width var(--ease);
        position: relative;
        border-radius: 0;
    }

    .level-progress-ticks {
        position: absolute;
        inset: 0;
        background-image: var(--tick-gradient, none);
        pointer-events: none;
    }

    .button-grid {
        display: grid;
        grid-template-columns:
            minmax(5ch, 1fr)
            minmax(7ch, max-content)
            minmax(9ch, max-content);
        gap: var(--spacing-md);
    }

    .button-grid.stacked {
        grid-template-columns: 1fr;
    }
</style>
