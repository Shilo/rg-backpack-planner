<script lang="ts">
  import { ArrowUpIcon, HexagonIcon, MagnifyingGlassPlusIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import SideMenuSection from "../SideMenuSection.svelte";
  import TreeContextMenuList from "../TreeContextMenuList.svelte";
  import ResetAllTreesButton from "../buttons/ResetAllTreesButton.svelte";
  import ToggleSwitch from "../ToggleSwitch.svelte";
  import { formatNumber } from "../mathUtil";
  import { openTechCrystalsOwnedModal } from "../techCrystalModal";
  import { treeLevels } from "../treeLevelsStore";
  import {
    techCrystalsAvailable,
    techCrystalsOwned,
  } from "../techCrystalStore";
  import { closeUpView } from "../closeUpViewStore";
  import { singleLevelUp } from "../singleLevelUpStore";
  import type { TreeViewState } from "../Tree.svelte";

  export let activeTreeName = "";
  export let activeTreeIndex = 0;
  export let activeTreeViewState: TreeViewState | null = null;
  export let activeTreeFocusViewState: TreeViewState | null = null;
  export let onClose: (() => void) | null = null;
  export let onResetAll: (() => void) | null = null;
  export let onResetTree: (() => void) | null = null;
  export let onFocusInView: (() => void) | null = null;

  $: hasOwned = $techCrystalsOwned > 0;
</script>

<SideMenuSection title="Global">
  <Button
    on:click={() => {
      openTechCrystalsOwnedModal($techCrystalsOwned);
    }}
    tooltipText={"Change Tech Crystal owned (budget)"}
    icon={HexagonIcon}
    iconClass="button-icon button-icon-filled"
    iconWeight="fill"
  >
    Tech Crystals:<br />
    <span
      class="tech-crystals-available"
      class:is-negative={$techCrystalsAvailable < 0 && hasOwned}
    >
      {formatNumber($techCrystalsAvailable)}
    </span>
    <span class="tech-crystals-separator"> / </span>
    <span class="tech-crystals-owned">{formatNumber($techCrystalsOwned)}</span>
  </Button>
  <ToggleSwitch
    checked={$singleLevelUp}
    label="Single Level-up"
    ariaLabel="Single level-up mode"
    tooltipText="When enabled, tapping a node increments its level by 1. When disabled, tapping a node maxes it out"
    icon={ArrowUpIcon}
    onToggle={() => singleLevelUp.toggle()}
  />
  <ToggleSwitch
    checked={$closeUpView}
    label="Close-up View"
    ariaLabel="Close-up view (150% zoom)"
    tooltipText="Increase the initial zoom scale by 1.5x"
    icon={MagnifyingGlassPlusIcon}
    onToggle={() => closeUpView.toggle()}
  />
  <ResetAllTreesButton
    onResetAll={() => {
      onResetAll?.();
      onClose?.();
    }}
    levelsByTree={$treeLevels}
  />
</SideMenuSection>
<SideMenuSection title={`${activeTreeName.toUpperCase()} TREE`}>
  <TreeContextMenuList
    tabLabel={activeTreeName}
    hideStats={true}
    onFocusInView={() => {
      onFocusInView?.();
      onClose?.();
    }}
    onReset={() => {
      onResetTree?.();
      onClose?.();
    }}
    viewState={activeTreeViewState}
    focusViewState={activeTreeFocusViewState}
    levelsById={$treeLevels[activeTreeIndex] ?? null}
  />
</SideMenuSection>

<style>
  .tech-crystals-available {
    color: #ffffff;
  }

  .tech-crystals-available.is-negative {
    color: #f87171;
  }

  .tech-crystals-separator {
    color: #c7d6ff;
  }

  .tech-crystals-owned {
    color: #e6f0ff;
  }

  :global(.button-icon-filled) {
    fill: currentColor;
    stroke: none;
  }
</style>
