<script lang="ts">
  import FocusInViewButton from "./buttons/FocusInViewButton.svelte";
  import ResetTreeButton from "./buttons/ResetTreeButton.svelte";
  import type { TreeViewState, TreeNode } from "./Tree.svelte";
  import type { LevelsById } from "./treeLevelsStore";
  import { techCrystalsSpentByTree } from "./techCrystalStore";

  export let onFocusInView: (() => void) | null = null;
  export let onReset: (() => void) | null = null;
  export let onButtonPress: (() => void) | null = null;
  export let viewState: TreeViewState | null = null;
  export let focusViewState: TreeViewState | null = null;
  export let levelsById: LevelsById | null = null;
  export let hideView0ptions = false;
  export let tabLabel = "";
  export let tabIndex = -1;
  export let nodes: TreeNode[] = [];

  // Calculate current/max levels
  $: currentLevel = levelsById
    ? Object.entries(levelsById)
        .filter(([id]) => id !== "root")
        .reduce((sum, [, level]) => sum + (level ?? 0), 0)
    : 0;
  $: maxLevel = nodes
    .filter((node) => node.id !== "root")
    .reduce((sum, node) => sum + node.maxLevel, 0);

  // Get tech crystals spent for this tree
  $: techCrystalsSpent = tabIndex >= 0 ? $techCrystalsSpentByTree[tabIndex] ?? 0 : 0;
</script>

<div class="tree-stats">
  <div class="stat-row">
    <span class="stat-label">Tech Crystals:</span>
    <span class="stat-value">{techCrystalsSpent}</span>
  </div>
  <div class="stat-row">
    <span class="stat-label">Levels:</span>
    <span class="stat-value">{currentLevel} / {maxLevel}</span>
  </div>
</div>

<ResetTreeButton {onReset} {levelsById} treeLabel={tabLabel} onPress={onButtonPress} />
{#if !hideView0ptions}
  <FocusInViewButton
    {onFocusInView}
    onPress={onButtonPress}
    {viewState}
    {focusViewState}
  />
{/if}

<style>
  .tree-stats {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(44, 60, 97, 0.5);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }

  .stat-label {
    color: #8fa4ce;
  }

  .stat-value {
    color: #e8eefc;
    font-weight: 600;
  }
</style>
