<script lang="ts">
    import {
        HexagonIcon,
        ShieldIcon,
        SwordIcon,
        TargetIcon,
        TreeIcon,
    } from "phosphor-svelte";
    import FocusInViewButton from "./buttons/FocusInViewButton.svelte";
    import ResetTreeButton from "./buttons/ResetTreeButton.svelte";
    import type { TreeViewState } from "./Tree.svelte";
    import type { Node, LevelsByIndex } from "../types/tree";
    import { techCrystalsSpentByTree } from "./techCrystalStore";
    import { formatNumber } from "./mathUtil";
    import { t } from "svelte-whisper";

    export let onFocusInView: (() => void) | null = null;
    export let onReset: (() => void) | null = null;
    export let onButtonPress: (() => void) | null = null;
    export let viewState: TreeViewState | null = null;
    export let focusViewState: TreeViewState | null = null;
    export let levelsById: LevelsByIndex | null = null;
    export let hideViewOptions = false;
    export let hideStats = false;
    export let tabId = "";
    export let tabLabel = "";
    export let tabIndex = -1;
    export let nodes: Node[] = [];

    $: treeIcon = (() => {
        if (tabId === "guardian") return ShieldIcon;
        if (tabId === "vanguard") return SwordIcon;
        if (tabId === "cannon") return TargetIcon;
        return TreeIcon;
    })();

    $: currentLevel = levelsById
        ? Object.values(levelsById).reduce(
              (sum, level) => sum + (level ?? 0),
              0,
          )
        : 0;
    $: maxLevel = nodes.reduce((sum, node) => sum + node.maxLevel, 0);

    // Get tech crystals spent for this tree
    $: techCrystalsSpent =
        tabIndex >= 0 ? ($techCrystalsSpentByTree[tabIndex] ?? 0) : 0;

    $: treeTierInfo = (() => {
        const calculateNodeTier = (level: number, max: number) => {
            if (max <= 1) return level > 0 ? 5 : 0;
            return Math.floor(level / (max / 5));
        };

        const getBranchTier = (idx1: number, idx2: number) => {
            if (!levelsById || !nodes[idx1] || !nodes[idx2]) return 0;
            const t1 = calculateNodeTier(
                levelsById[idx1] || 0,
                nodes[idx1].maxLevel,
            );
            const t2 = calculateNodeTier(
                levelsById[idx2] || 0,
                nodes[idx2].maxLevel,
            );
            return Math.min(t1, t2);
        };

        // Indices from baseTree.ts: Yellow (7,8), Orange (17,18), Blue (27,28)
        const yellowTier = getBranchTier(7, 8);
        const orangeTier = getBranchTier(17, 18);
        const blueTier = getBranchTier(27, 28);

        return {
            completed: Math.max(yellowTier, orangeTier, blueTier),
            total: 5,
        };
    })();

    $: totalTechCrystalsSpent = $techCrystalsSpentByTree.reduce(
        (sum, val) => sum + (val ?? 0),
        0,
    );

    function parseDescription(text: string): string {
        if (!text) return "";
        return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    }
</script>

{#if !hideStats}
    <div class="info-header">
        <div class="node-icon-wrapper">
            <svelte:component this={treeIcon} />
        </div>
        <div class="info-header-text">
            <span class="skill-name"
                >{$t("trees.named", { label: tabLabel })}</span
            >
            <div class="bonus-display">
                <span class="bonus-icon"
                    ><HexagonIcon size={14} weight="fill" /></span
                >
                <span class="bonus-current">
                    {formatNumber(techCrystalsSpent)} / {formatNumber(
                        totalTechCrystalsSpent,
                    )}
                </span>
            </div>
        </div>
    </div>

    {#if tabId && $t(`trees.description.${tabId}`)}
        <div class="tree-desc">
            {@html parseDescription($t(`trees.description.${tabId}`))}
        </div>
    {/if}

    <div class="tree-stats">
        <div class="meta-row">
            <div class="meta-item">
                <span class="meta-label">{$t("nodeMenu.level")}</span>
                <span class="meta-value"
                    >{formatNumber(currentLevel)}<span class="meta-sep">/</span
                    >{formatNumber(maxLevel)}</span
                >
            </div>
            <div class="meta-item">
                <span class="meta-label">{$t("nodeMenu.tier")}</span>
                <span class="meta-value"
                    >{treeTierInfo.completed}<span class="meta-sep">/</span
                    >{treeTierInfo.total}</span
                >
            </div>
        </div>

        <div class="progress">
            <div
                class="progress-fill"
                style={`width: ${maxLevel > 0 ? (currentLevel / maxLevel) * 100 : 0}%`}
            ></div>
        </div>
    </div>
{/if}

<div class="menu-actions">
    <ResetTreeButton
        {onReset}
        {levelsById}
        treeLabel={tabLabel}
        onPress={onButtonPress}
    />
    {#if !hideViewOptions}
        <FocusInViewButton
            {onFocusInView}
            onPress={onButtonPress}
            {viewState}
            {focusViewState}
        />
    {/if}
</div>

<style>
    .info-header {
        display: flex;
        gap: var(--spacing-md);
        align-items: center;
        width: 100%;
        margin-bottom: var(--spacing-sm);
    }

    .tree-desc {
        font-size: var(--font-xs);
        line-height: 1.4;
        color: var(--text-muted);
        margin-bottom: var(--spacing-md);
        padding: var(--spacing-sm);
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        border-left: 2px solid var(--accent);
    }

    .tree-desc :global(strong) {
        color: var(--text);
        font-weight: var(--weight-bold);
    }

    .menu-actions {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
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
        gap: 2px;
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
        gap: var(--spacing-sm);
        padding: 0;
    }

    .bonus-icon {
        display: flex;
        align-items: center;
        color: var(--text-muted);
    }

    .bonus-current {
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
    }

    .tree-stats {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
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
        font-size: var(--font-xs);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .meta-value {
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        color: var(--text);
        font-variant-numeric: tabular-nums;
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
</style>
