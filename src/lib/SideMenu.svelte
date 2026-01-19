<script lang="ts">
  import { HelpCircle, Hexagon, Share2, Trash2 } from "lucide-svelte";
  import packageInfo from "../../package.json";
  import Button from "./Button.svelte";
  import CodeBlockTable from "./CodeBlockTable.svelte";
  import SideMenuSection from "./SideMenuSection.svelte";
  import TreeContextMenuList from "./TreeContextMenuList.svelte";
  import { openModal } from "./modalStore";
  import {
    techCrystalsOwned,
    techCrystalsSpentTotal,
    techCrystalsSpentGuardian,
    techCrystalsSpentVanguard,
    techCrystalsSpentCannon,
    setTechCrystalsOwned,
  } from "./techCrystalsStore";

  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onShareBuild: (() => void) | null = null;
  export let onHelp: (() => void) | null = null;
  export let onResetAll: (() => void) | null = null;
  export let onResetTree: (() => void) | null = null;
  export let onFocusInView: (() => void) | null = null;
  export let activeTreeName = "";
  const title = packageInfo.name;

  let backdropEl: HTMLButtonElement | null = null;
  let menuEl: HTMLElement | null = null;

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
</script>

<button
  class={`menu-backdrop${isOpen ? " visible" : ""}`}
  aria-label="Close menu"
  bind:this={backdropEl}
  tabindex={isOpen ? 0 : -1}
  inert={!isOpen}
  on:click={() => onClose?.()}
  type="button"
></button>
<aside class="side-menu" class:open={isOpen} bind:this={menuEl} inert={!isOpen}>
  <nav class="side-menu__content" aria-label="Primary">
    <SideMenuSection title="TECH CRYSTALS">
      <CodeBlockTable
        headers={["Spent", "Amount"]}
        rows={[
          ["Total", `${$techCrystalsSpentTotal}`],
          ["Guardian", `${$techCrystalsSpentGuardian}`],
          ["Vanguard", `${$techCrystalsSpentVanguard}`],
          ["Cannon", `${$techCrystalsSpentCannon}`],
        ]}
      />
      <Button
        on:click={() => {
          openModal({
            type: "input",
            title: "TECH CRYSTALS OWNED",
            input: {
              label: "Set your budget",
              value: $techCrystalsOwned,
              min: 0,
              step: 1,
            },
            confirmLabel: "Save",
            cancelLabel: "Cancel",
            onConfirm: (value) => {
              if (typeof value === "number") {
                setTechCrystalsOwned(value);
              }
            },
          });
        }}
        tooltipText={"Change Tech Crystal budget"}
        icon={Hexagon}
      >
        Owned: {$techCrystalsOwned}
      </Button>
      <Button
        on:click={() => {
          onResetAll?.();
          onClose?.();
        }}
        toastMessage={onResetAll ? "All trees reset" : undefined}
        toastNegative
        tooltipText={"Revert all nodes to level 0 and refund Tech Crystals"}
        icon={Trash2}
        negative
      >
        Reset all
      </Button>
    </SideMenuSection>
    <SideMenuSection title={`${activeTreeName.toUpperCase()} TREE`}>
      <TreeContextMenuList
        onFocusInView={() => {
          onFocusInView?.();
          onClose?.();
        }}
        onReset={() => {
          onResetTree?.();
          onClose?.();
        }}
      />
    </SideMenuSection>
    <SideMenuSection title="SUPPORT">
      <Button
        on:click={() => {
          onShareBuild?.();
        }}
        toastMessage={onShareBuild
          ? "Share link copied to clipboard"
          : undefined}
        icon={Share2}
      >
        Share build
      </Button>
      <Button on:click={() => onHelp?.()} icon={HelpCircle}>Help</Button>
    </SideMenuSection>
  </nav>
  <h2 class="side-menu__title">{title}</h2>
</aside>

<style>
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
    width: 78vw;
    max-width: 85%;
    width: min(217px, 85%);
    background: rgba(10, 16, 28, 0.98);
    border-left: 1px solid rgba(79, 111, 191, 0.35);
    transform: translateX(100%);
    transition: transform 0.25s ease;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow: hidden;
    z-index: 9;
  }

  .side-menu.open {
    transform: translateX(0);
  }

  .side-menu__title {
    position: absolute;
    left: 10px;
    bottom: 10px;
    height: 32px;
    width: calc(100% - 10px - 32px - 10px);
    line-height: 32px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    font-size: 0.85rem;
    color: #e7efff;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .side-menu__content {
    display: grid;
    gap: 18px;
    overflow-y: auto;
    padding-left: 10px;
    padding-right: 10px;
    scrollbar-gutter: stable;
    max-height: calc(100% - 42px);
  }

  .side-menu__content::before {
    content: "";
    height: 0px;
    display: block;
  }

  .side-menu__content::after {
    content: "";
    height: 0px;
    display: block;
  }
</style>
