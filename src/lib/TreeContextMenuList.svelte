<script lang="ts">
    import {
        TreeIcon,
    } from "phosphor-svelte";
    import FocusInViewButton from "./buttons/FocusInViewButton.svelte";
    import ProgressBar from "./ProgressBar.svelte";
    import ResetTreeButton from "./buttons/ResetTreeButton.svelte";
    import type { TreeViewState } from "./Tree.svelte";
    import type { Node, LevelsByIndex } from "../types/tree";
    import type { TreeBranchKey } from "./treeLevelsStore";
    import { techCrystalsSpentByTree } from "./techCrystalStore";
    import { formatNumber } from "svelte-whisper";
    import { t } from "svelte-whisper";

    import { SKILL_NODE_ICONS } from "../config/skillNodeIcons";
    import type { SkillId } from "../types/tree";

    import { SKILL_METADATA } from "../config/skillMetadata";

    import { guardianSkillIds } from "../config/guardianTree";
    import { vanguardSkillIds } from "../config/vanguardTree";
    import { cannonSkillIds } from "../config/cannonTree";
    import { TechCrystalIcon, GuardianIcon, VanguardIcon, CannonIcon } from "./customIcons";
    import { sortByDisplayOrder } from "./skillBonusStore";

    export let onFocusInView: (() => void) | null = null;
    export let onReset: (() => void) | null = null;
    export let onResetBranch: ((branch: TreeBranchKey) => void) | null = null;
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
        if (tabId === "guardian") return GuardianIcon;
        if (tabId === "vanguard") return VanguardIcon;
        if (tabId === "cannon") return CannonIcon;
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

    const SPECIAL_SKILLS_BY_TAB: Record<string, SkillId[]> = {
        guardian: sortByDisplayOrder(guardianSkillIds),
        vanguard: sortByDisplayOrder(vanguardSkillIds),
        cannon: sortByDisplayOrder(cannonSkillIds),
    };

    $: specialSkills = tabId ? (SPECIAL_SKILLS_BY_TAB[tabId] ?? []) : [];

    $: specialSkillsSummary = (() => {
        if (!specialSkills.length || !nodes.length) return [];

        return specialSkills.map((skillId) => {
            let currentTotal = 0;

            nodes.forEach((node, idx) => {
                if (node.skillId === skillId) {
                    currentTotal += levelsById?.[idx] ?? 0;
                }
            });

            const metadata = SKILL_METADATA[skillId];
            const currentValue = metadata
                ? metadata.getTotalValue(currentTotal)
                : 0;

            return {
                id: skillId,
                currentValue,
                icon: SKILL_NODE_ICONS[skillId],
            };
        });
    })();

    function formatBonusValue(v: number): string {
        if (v === 0) return "0";
        if (Number.isInteger(v)) return formatNumber(v);
        return String(parseFloat(v.toPrecision(3)));
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
                    ><TechCrystalIcon size={14} weight="fill" /></span
                >
                <span class="bonus-current">
                    {formatNumber(techCrystalsSpent)} / {formatNumber(
                        totalTechCrystalsSpent,
                    )}
                </span>
            </div>
        </div>
    </div>

    {#if specialSkillsSummary.length > 0}
        <div class="special-skills-list">
            {#each specialSkillsSummary as skill}
                <div class="special-skill-item">
                    <span class="skill-icon-mini">
                        <svelte:component this={skill.icon} />
                    </span>
                    <span class="meta-label"
                        >{$t(`skills.short.${skill.id}`)}</span
                    >
                    <span class="meta-value" class:meta-value--active={skill.currentValue > 0}>
                        {formatBonusValue(skill.currentValue * 100)}%
                    </span>
                </div>
            {/each}
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

        <ProgressBar value={maxLevel > 0 ? currentLevel / maxLevel : 0} />
    </div>
{/if}

<div class="menu-actions">
    <ResetTreeButton
        {onReset}
        onResetBranch={onResetBranch}
        {levelsById}
        treeLabel={tabLabel}
        treeNodes={nodes}
        treeId={tabId}
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

    .special-skills-list {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-md);
        padding: 0;
        background: none;
        border: none;
        font-size: var(--font-base);
        color: var(--text-muted);
        line-height: normal;
        align-items: center;
    }

    .special-skill-item {
        display: contents;
    }

    .skill-icon-mini {
        width: 19px;
        height: 19px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--accent-light);
        grid-column: 1;
    }

    .special-skill-item :global(.meta-label) {
        grid-column: 2;
        font-size: inherit;
        color: inherit;
        letter-spacing: 0.05em;
    }

    .special-skill-item :global(.meta-value) {
        grid-column: 3;
        font-size: inherit;
        color: var(--text);
        font-weight: var(--weight-bold);
        font-variant-numeric: tabular-nums;
        justify-self: end;
    }

    .special-skill-item :global(.meta-sep) {
        opacity: var(--opacity-disabled);
        margin: 0 1px;
    }

    .skill-icon-mini :global(svg) {
        width: 100%;
        height: 100%;
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
        background: var(--bg-raised);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
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
        gap: var(--spacing-xs);
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

    .bonus-icon {
        display: flex;
        align-items: center;
        color: var(--accent);
    }

    .bonus-current {
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
    }

    .special-skill-item :global(.meta-value--active) {
        color: var(--accent-light);
    }

    .tree-stats {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
        background: color-mix(in srgb, var(--accent) 5%, transparent);
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm);
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

</style>
