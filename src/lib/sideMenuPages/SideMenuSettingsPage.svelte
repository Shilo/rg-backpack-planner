<script lang="ts">
  import {
    ArrowClockwiseIcon,
    ArrowUpIcon,
    ClockCounterClockwiseIcon,
    CubeFocusIcon,
    MagnifyingGlassPlusIcon,
    TrashSimpleIcon,
  } from "phosphor-svelte";
  import type { ComponentType } from "svelte";
  import Button from "../Button.svelte";
  import InstallPwaButton from "../buttons/InstallPwaButton.svelte";
  import ResetAllTreesButton from "../buttons/ResetAllTreesButton.svelte";
  import ResetTreeButton from "../buttons/ResetTreeButton.svelte";
  import ShareBuildButton from "../buttons/ShareBuildButton.svelte";
  import TechCrystalsButton from "../buttons/TechCrystalsButton.svelte";
  import { closeUpView } from "../closeUpViewStore";
  import { openModal } from "../modalStore";
  import SideMenuPreviewSection from "./SideMenuPreviewSection.svelte";
  import { isPreviewMode } from "../previewModeStore";
  import SideMenuSection from "../SideMenuSection.svelte";
  import { singleLevelUp } from "../singleLevelUpStore";
  import { showToast } from "../toast";
  import ToggleSwitch from "../ToggleSwitch.svelte";
  import type { TreeViewState } from "../Tree.svelte";
  import { treeLevels } from "../treeLevelsStore";

  export let activeTreeName = "";
  export let activeTreeIndex = 0;
  export let activeTreeViewState: TreeViewState | null = null;
  export let activeTreeFocusViewState: TreeViewState | null = null;
  export let onClose: (() => void) | null = null;
  export let onResetAll: (() => void) | null = null;
  export let onResetTree: (() => void) | null = null;
  export let onFocusInView: (() => void) | null = null;

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

  function handleReloadWindow() {
    // Simply reload the page without clearing data
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  function handleClearAllData() {
    openModal({
      type: "confirm",
      title: "CLEAR ALL DATA",
      titleIcon: TrashSimpleIcon as unknown as ComponentType,
      message:
        "Delete all data and reload the application. This will reset all trees, settings, and progress.",
      confirmLabel: "Clear all data",
      cancelLabel: "Cancel",
      confirmNegative: true,
      onConfirm: () => {
        // Clear all localStorage
        if (typeof window !== "undefined") {
          localStorage.clear();
        }
        // Reload the page
        window.location.reload();
      },
    });
  }
</script>

<SideMenuPreviewSection />

<SideMenuSection title="Build">
  <TechCrystalsButton disabled={$isPreviewMode} />
  <ShareBuildButton title="Share my build" disabled={$isPreviewMode} />
</SideMenuSection>

<SideMenuSection title="Node">
  <ToggleSwitch
    checked={$singleLevelUp}
    label="Single Level Up"
    ariaLabel="Single level up mode"
    tooltipText="When enabled, tapping a node increments its level by 1. When disabled, tapping a node maxes it out"
    icon={ArrowUpIcon as unknown as ComponentType}
    onToggle={() => singleLevelUp.toggle()}
  />
</SideMenuSection>

<SideMenuSection title="View">
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

<SideMenuSection title="Tree">
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
</SideMenuSection>

<SideMenuSection title="Application">
  <InstallPwaButton title={true} />
  <Button
    on:click={handleReloadWindow}
    tooltipText={"Refresh the page"}
    icon={ArrowClockwiseIcon}
  >
    Reload Window
  </Button>
  <Button
    on:click={handleResetSettings}
    tooltipText={"Restore all settings to their default values"}
    icon={ClockCounterClockwiseIcon}
    negative
  >
    Reset Settings
  </Button>
  <div class="spacer"></div>
  <Button
    on:click={handleClearAllData}
    tooltipText={"Delete all data and reload the application"}
    icon={TrashSimpleIcon}
    negative
  >
    Clear All Data
  </Button>
</SideMenuSection>

<style>
  .spacer {
    height: 6px;
  }
</style>
