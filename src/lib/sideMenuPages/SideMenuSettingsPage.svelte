<script lang="ts">
  import type { ComponentType } from "svelte";
  import {
    ClockCounterClockwiseIcon,
    ArrowUpIcon,
    CubeFocusIcon,
    HexagonIcon,
    MagnifyingGlassPlusIcon,
  } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import SideMenuSection from "../SideMenuSection.svelte";
  import ResetAllTreesButton from "../buttons/ResetAllTreesButton.svelte";
  import ResetTreeButton from "../buttons/ResetTreeButton.svelte";
  import ToggleSwitch from "../ToggleSwitch.svelte";
  import { formatNumber } from "../mathUtil";
  import { openModal } from "../modalStore";
  import { openTechCrystalsOwnedModal } from "../techCrystalModal";
  import { treeLevels } from "../treeLevelsStore";
  import {
    techCrystalsAvailable,
    techCrystalsOwned,
  } from "../techCrystalStore";
  import { closeUpView } from "../closeUpViewStore";
  import { singleLevelUp } from "../singleLevelUpStore";
  import { showToast } from "../toast";
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

  const POS_EPSILON = 0.5;
  const SCALE_EPSILON = 0.001;

  const isClose = (a: number, b: number, epsilon: number) =>
    Math.abs(a - b) <= epsilon;

  $: isFocused =
    !!activeTreeViewState &&
    !!activeTreeFocusViewState &&
    isClose(
      activeTreeViewState.offsetX,
      activeTreeFocusViewState.offsetX,
      POS_EPSILON,
    ) &&
    isClose(
      activeTreeViewState.offsetY,
      activeTreeFocusViewState.offsetY,
      POS_EPSILON,
    ) &&
    isClose(
      activeTreeViewState.scale,
      activeTreeFocusViewState.scale,
      SCALE_EPSILON,
    );

  $: isFocusDisabled = !onFocusInView || isFocused;

  function handleResetSettings() {
    openModal({
      type: "confirm",
      title: "RESET SETTINGS",
      titleIcon: ClockCounterClockwiseIcon as unknown as ComponentType,
      message:
        "Restore all settings to their default values. This will not affect your backpack tree progress.",
      confirmLabel: "Reset settings",
      cancelLabel: "Cancel",
      confirmNegative: true,
      onConfirm: () => {
        // Reset stores to defaults
        // (this will set the localStorage values to the defaults also)
        singleLevelUp.set(false);
        closeUpView.set(false);

        showToast("Settings reset to defaults");
        onClose?.();
      },
    });
  }
</script>

<SideMenuSection title="General">
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
</SideMenuSection>

<SideMenuSection title="Node Interaction">
  <ToggleSwitch
    checked={$singleLevelUp}
    label="Single Level Up"
    ariaLabel="Single level up mode"
    tooltipText="When enabled, tapping a node increments its level by 1. When disabled, tapping a node maxes it out"
    icon={ArrowUpIcon as unknown as ComponentType}
    onToggle={() => singleLevelUp.toggle()}
  />
</SideMenuSection>

<SideMenuSection title="Display">
  <ToggleSwitch
    checked={$closeUpView}
    label="Close-up View"
    ariaLabel="Close-up view (150% zoom)"
    tooltipText="Increase the initial zoom scale by 1.5x"
    icon={MagnifyingGlassPlusIcon as unknown as ComponentType}
    onToggle={() => closeUpView.toggle()}
  />
  <Button
    on:click={() => {
      if (!onFocusInView) return;
      onFocusInView();
      onClose?.();
    }}
    tooltipText={"Fit nodes in view by resetting zoom and pan"}
    icon={CubeFocusIcon}
    disabled={isFocusDisabled}
  >
    Focus Tree in View
  </Button>
</SideMenuSection>

<SideMenuSection title="Recovery">
  <ResetTreeButton
    onReset={() => {
      onResetTree?.();
      onClose?.();
    }}
    levelsById={$treeLevels[activeTreeIndex] ?? null}
    treeLabel={activeTreeName}
  />
  <ResetAllTreesButton
    onResetAll={() => {
      onResetAll?.();
      onClose?.();
    }}
    levelsByTree={$treeLevels}
  />
  <div class="spacer"></div>
  <Button
    on:click={handleResetSettings}
    tooltipText={"Restore all settings to their default values"}
    icon={ClockCounterClockwiseIcon}
    negative
  >
    Reset Settings
  </Button>
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

  .spacer {
    height: 6px;
  }
</style>
