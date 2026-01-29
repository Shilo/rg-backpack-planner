<script lang="ts">
  import FocusInViewButton from "./buttons/FocusInViewButton.svelte";
  import ResetTreeButton from "./buttons/ResetTreeButton.svelte";
  import type { TreeViewState } from "./Tree.svelte";
  import type { Node, LevelsByIndex } from "../types/tree";
  import { techCrystalsSpentByTree } from "./techCrystalStore";
  import { formatNumber } from "./mathUtil";

  export let onFocusInView: (() => void) | null = null;
  export let onReset: (() => void) | null = null;
  export let onButtonPress: (() => void) | null = null;
  export let viewState: TreeViewState | null = null;
  export let focusViewState: TreeViewState | null = null;
  export let levelsById: LevelsByIndex | null = null;
  export let hideView0ptions = false;
  export let hideStats = false;
  export let tabLabel = "";
  export let tabIndex = -1;
  export let nodes: Node[] = [];

  $: currentLevel = levelsById
    ? Object.values(levelsById).reduce((sum, level) => sum + (level ?? 0), 0)
    : 0;
  $: maxLevel = nodes.reduce((sum, node) => sum + node.maxLevel, 0);

  // Get tech crystals spent for this tree
  $: techCrystalsSpent =
    tabIndex >= 0 ? ($techCrystalsSpentByTree[tabIndex] ?? 0) : 0;
</script>

{#if !hideStats}
  <div class="tree-stats">
    <div class="stat-row">
      <span class="stat-label">Tech Crystals:</span>
      <span class="stat-value">{formatNumber(techCrystalsSpent)}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Levels:</span>
      <span class="stat-value"
        >{formatNumber(currentLevel)} / {formatNumber(maxLevel)}</span
      >
    </div>
    <div class="level-progress">
      <div
        class="level-progress-bar"
        style={`width: ${maxLevel > 0 ? (currentLevel / maxLevel) * 100 : 0}%`}
      ></div>
    </div>
  </div>
{/if}

<ResetTreeButton
  {onReset}
  {levelsById}
  treeLabel={tabLabel}
  onPress={onButtonPress}
/>
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

  .level-progress {
    width: 100%;
    height: 6px;
    background: rgba(44, 53, 80, 0.5);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 2px;
  }

  .level-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4c6fff, #5aa6ff);
    border-radius: 3px;
    transition: width 0.2s ease;
  }
</style>
