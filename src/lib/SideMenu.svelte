<script lang="ts">
  import { HelpCircle, Hexagon } from "lucide-svelte";
  import Button from "./Button.svelte";
  import CodeBlockTable from "./CodeBlockTable.svelte";
  import SideMenuSection from "./SideMenuSection.svelte";
  import TreeContextMenuList from "./TreeContextMenuList.svelte";
  import CopyStatsButton from "./buttons/CopyStatsButton.svelte";
  import InstallPwaButton from "./buttons/InstallPwaButton.svelte";
  import ResetAllTreesButton from "./buttons/ResetAllTreesButton.svelte";
  import ShareBuildButton from "./buttons/ShareBuildButton.svelte";
  import type { TreeViewState } from "./Tree.svelte";
  import { openTechCrystalsOwnedModal } from "./techCrystalModal";
  import { triggerHaptic } from "./haptics";
  import {
    treeLevels,
    treeLevelsTotal,
    treeLevelsGuardian,
    treeLevelsVanguard,
    treeLevelsCannon,
  } from "./treeLevelsStore";
  import {
    techCrystalsAvailable,
    techCrystalsOwned,
    techCrystalsSpentTotal,
    techCrystalsSpentGuardian,
    techCrystalsSpentVanguard,
    techCrystalsSpentCannon,
  } from "./techCrystalStore";
  import { closeUpView } from "./closeUpViewStore";
  import ToggleSwitch from "./ToggleSwitch.svelte";

  $: hasOwned = $techCrystalsOwned > 0;
  let statsRows: Array<[string, string]> = [];
  $: statsRows = [
    ["Tech Crystals Spent", ""],
    ["Total", `${$techCrystalsSpentTotal}`],
    ["Guardian", `${$techCrystalsSpentGuardian}`],
    ["Vanguard", `${$techCrystalsSpentVanguard}`],
    ["Cannon", `${$techCrystalsSpentCannon}`],
    ["Backpack Node Levels", ""],
    ["Total", `${$treeLevelsTotal}`],
    ["Guardian", `${$treeLevelsGuardian}`],
    ["Vanguard", `${$treeLevelsVanguard}`],
    ["Cannon", `${$treeLevelsCannon}`],
    ["Backpack Skill Boosts", ""],
    ["TODO", "TODO"],
    ["Attack Boost", "10,000%"],
    ["Defense Boost", "30,000%"],
    ["Critical Hit", "160%"],
    ["Global ATK", "200%"],
    ["Final Damage Boost", "20%"],
  ];

  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onShareBuild: (() => void) | null = null;
  export let onHelp: (() => void) | null = null;
  export let onResetAll: (() => void) | null = null;
  export let onResetTree: (() => void) | null = null;
  export let onFocusInView: (() => void) | null = null;
  export let activeTreeName = "";
  export let activeTreeIndex = 0;
  export let activeTreeViewState: TreeViewState | null = null;
  export let activeTreeFocusViewState: TreeViewState | null = null;
  let backdropEl: HTMLButtonElement | null = null;
  let menuEl: HTMLElement | null = null;
  let statsTable: CodeBlockTable | null = null;
  $: if (!isOpen) {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      ((backdropEl && backdropEl.contains(active)) ||
        (menuEl && menuEl.contains(active)))
    ) {
      active.blur();
    }
  }

  function handleBackdropClick() {
    triggerHaptic();
    onClose?.();
  }
</script>

<button
  class={`menu-backdrop${isOpen ? " visible" : ""}`}
  aria-label="Close menu"
  bind:this={backdropEl}
  tabindex={isOpen ? 0 : -1}
  inert={!isOpen}
  on:click={handleBackdropClick}
  type="button"
></button>
<aside class="side-menu" class:open={isOpen} bind:this={menuEl} inert={!isOpen}>
  <div class="side-menu__scroll-area">
    <nav class="side-menu__content" aria-label="Primary">
      <div class="side-menu__content-inner">
        <SideMenuSection title="GLOBAL">
          <Button
            on:click={() => {
              openTechCrystalsOwnedModal($techCrystalsOwned);
            }}
            tooltipText={"Change Tech Crystal owned (budget)"}
            icon={Hexagon}
            iconClass="button-icon button-icon-filled"
          >
            Tech Crystals:<br />
            <span
              class="tech-crystals-available"
              class:is-negative={$techCrystalsAvailable < 0 && hasOwned}
            >
              {`${$techCrystalsAvailable}`}
            </span>
            <span class="tech-crystals-separator"> / </span>
            <span class="tech-crystals-owned">{`${$techCrystalsOwned}`}</span>
          </Button>
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
        <SideMenuSection title="SETTINGS">
          <ToggleSwitch
            checked={$closeUpView}
            label="Close-up View"
            ariaLabel="Close-up view (200% zoom)"
            tooltipText="Double the initial zoom scale."
            onToggle={() => closeUpView.toggle()}
          />
        </SideMenuSection>
        <SideMenuSection title="STATISTICS">
          <CopyStatsButton
            slot="action"
            class="side-menu__stats-copy"
            onCopy={() => statsTable?.copy()}
          />
          <div class="side-menu__stats-card">
            <CodeBlockTable bind:this={statsTable} rows={statsRows} />
          </div>
        </SideMenuSection>
      </div>
      <div class="side-menu__scroll-fade" aria-hidden="true"></div>
    </nav>
  </div>
  <div class="side-menu__footer">
    <ShareBuildButton
      class="side-menu__footer-button"
      onShare={() => onShareBuild?.()}
      toastMessage={onShareBuild
        ? "Share link copied to clipboard"
        : "Share is not implemented yet"}
      toastNegative={!onShareBuild}
    />
    <Button
      class="side-menu__footer-button"
      on:click={() => onHelp?.()}
      icon={HelpCircle}
      aria-label="Help"
      tooltipText="Help"
    ></Button>
    <InstallPwaButton className="side-menu__footer-button" />
  </div>
</aside>

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

  .side-menu__stats-card {
    display: grid;
    gap: 0;
    border: 1px solid rgba(74, 110, 184, 0.35);
    border-radius: 12px;
    overflow: hidden;
  }

  :global(.side-menu__stats-copy) {
    justify-self: end;
    padding: 0px !important;
    min-height: 0px !important;
    border-radius: 0px !important;
    background: transparent !important;
    border: none !important;
    color: #a7b7e6 !important;
    width: 18px !important;
    height: 18px !important;

    :global(.button-icon) {
      width: 100% !important;
      height: 100% !important;
    }
  }

  :global(.menu-backdrop) {
    position: fixed;
    inset: 0;
    background: rgba(3, 6, 15, 0.6);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    border: none;
    padding: 0;
    z-index: 7;
  }

  :global(.menu-backdrop.visible) {
    opacity: 1;
    pointer-events: auto;
  }

  .side-menu {
    position: fixed;
    top: 0;
    right: 0;
    height: 100%;
    max-width: 100%;
    width: fit-content;
    background: rgba(10, 16, 28, 0.98);
    border-left: 1px solid rgba(79, 111, 191, 0.35);
    transform: translateX(100%);
    transition: transform 0.25s ease;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0px;
    overflow: hidden;
    z-index: 9;
  }

  .side-menu.open {
    transform: translateX(0);
  }

  .side-menu__content {
    --side-menu-fade-height: 68px;
    display: block;
    height: 100%;
    overflow-y: auto;
    padding: 0 10px;
    scrollbar-gutter: stable;
  }

  .side-menu__content-inner {
    display: grid;
    gap: 10px;
    padding-bottom: var(--side-menu-fade-height);
  }

  .side-menu__content-inner > :global(:first-child) {
    margin-top: 8px;
  }

  .side-menu__content-inner > :global(:last-child) {
    margin-bottom: 10px;
  }

  .side-menu__scroll-area {
    position: relative;
    flex: 1;
    min-height: 0;
    height: 100%;
  }

  .side-menu__scroll-fade {
    position: sticky;
    bottom: 0;
    height: var(--side-menu-fade-height);
    margin-top: calc(-1 * var(--side-menu-fade-height));
    background: linear-gradient(
      to bottom,
      rgba(10, 16, 28, 0) 0%,
      rgba(10, 16, 28, 1) 28%
    );
    pointer-events: none;
  }

  :global(.button-icon-filled) {
    fill: currentColor;
    stroke: none;
  }

  .side-menu__footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
    padding: 0 10px 10px;
    margin-right: 42px;
    pointer-events: none;
  }

  .side-menu__footer :global(button) {
    pointer-events: auto;
  }
</style>
