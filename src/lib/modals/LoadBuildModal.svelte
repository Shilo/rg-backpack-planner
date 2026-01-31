<script lang="ts">
  import { onMount } from "svelte";
  import type { Component, ComponentType } from "svelte";
  import {
    ClipboardIcon,
    CaretDownIcon,
    RobotIcon,
    ShareNetworkIcon,
    SwordIcon,
  } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import ContextMenu from "../ContextMenu.svelte";
  import { showToast } from "../toast";
  import {
    parseEncodedFromUserInput,
    navigateToEncodedBuild,
  } from "../buildData/url";
  import { triggerHaptic } from "../haptics";
  import type { IconWeight } from "phosphor-svelte";
  import { portal } from "../portal";
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - package.json import is valid
  import appPackage from "../../../package.json";

  export let title = "PREVIEW shareable build";
  export let titleIcon: ComponentType | null = null;
  export let titleIconClass = "";
  export let titleIconAriaHidden = true;
  export let titleIconWeight: IconWeight | undefined = undefined;
  export let message: string | undefined =
    "Type a Backpack Planner link or just the build code.";
  export let confirmLabel = "Preview build";
  export let cancelLabel = "Cancel";
  export let onLoaded: (() => void) | null = null;
  export let onCancel: (() => void) | null = null;

  let inputText = "";
  let isLoading = false;
  let inputEl: HTMLInputElement | null = null;
  let previewButtonElement: HTMLButtonElement | null = null;
  let dropdownMenuOpen = false;
  let dropdownMenuX = 0;
  let dropdownMenuY = 0;

  // Recommended build key (from package.json) → icon component
  const recommendedBuildIcons: Record<string, Component> = {
    pve: RobotIcon,
    pvp: SwordIcon,
  };

  // Dynamically get all recommended builds from package.json
  const recommendedBuilds = (() => {
    const builds = appPackage?.recommendedBuilds;
    if (!builds || typeof builds !== "object") return [];

    return Object.entries(builds)
      .filter(([, value]) => typeof value === "string" && value.trim() !== "")
      .map(([key, value]) => ({
        name: key,
        code: value as string,
      }));
  })();

  const hasRecommendedBuilds = recommendedBuilds.length > 0;

  function handleCancel() {
    onCancel?.();
  }

  async function handlePasteClick() {
    triggerHaptic();
    if (
      !navigator.clipboard ||
      typeof navigator.clipboard.readText !== "function"
    ) {
      showToast("Clipboard not available", { tone: "negative" });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        showToast("Clipboard is empty", { tone: "negative" });
        return;
      }
      inputText = trimmed;
      // Move cursor to end for convenience
      queueMicrotask(() => {
        inputEl?.focus();
        inputEl?.setSelectionRange(inputText.length, inputText.length);
      });
    } catch {
      showToast("Unable to read from clipboard", { tone: "negative" });
    }
  }

  async function handleLoad(buildCode?: string) {
    if (isLoading) return;

    const raw = (buildCode ?? inputText).trim();
    if (!raw) {
      showToast("Type link or build code", { tone: "negative" });
      inputEl?.focus();
      return;
    }

    isLoading = true;
    try {
      const encoded = parseEncodedFromUserInput(raw);
      if (!encoded) {
        showToast("Invalid link or build data", { tone: "negative" });
        inputEl?.focus();
        return;
      }

      navigateToEncodedBuild(encoded);
      onLoaded?.();
    } finally {
      isLoading = false;
    }
  }

  function handleRecommendedClick(buildCode: string) {
    triggerHaptic();
    closeDropdownMenu();
    void handleLoad(buildCode);
  }

  function handleDropdownClick() {
    if (!previewButtonElement || !hasRecommendedBuilds) return;
    triggerHaptic();
    const rect = previewButtonElement.getBoundingClientRect();
    dropdownMenuX = rect.left + rect.width / 2;
    dropdownMenuY = rect.bottom + 8;
    dropdownMenuOpen = true;
  }

  function closeDropdownMenu() {
    dropdownMenuOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleLoad();
    }
  }

  onMount(() => {
    // Don't auto-focus on mobile/touch devices to avoid keyboard popup
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (!isCoarsePointer) {
      queueMicrotask(() => {
        inputEl?.focus();
        inputEl?.select();
      });
    }
  });
</script>

<div class="modal-content">
  <header class="modal-header">
    <div class="modal-title">
      {#if titleIcon}
        <svelte:component
          this={titleIcon}
          class={`modal-title-icon ${titleIconClass}`.trim()}
          aria-hidden={titleIconAriaHidden}
          weight={titleIconWeight}
        />
      {/if}
      <h2>{title}</h2>
    </div>
  </header>
  {#if message}
    <p class="modal-message">{message}</p>
  {/if}

  <label class="modal-label" for="load-build-input">
    Shareable link or build code
  </label>
  <div class="modal-input-row">
    <Button on:click={handlePasteClick} icon={ClipboardIcon}>Paste</Button>
    <input
      id="load-build-input"
      class="modal-input"
      bind:this={inputEl}
      type="text"
      placeholder="https://.../#1;2;3"
      inputmode="url"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      bind:value={inputText}
      on:keydown={handleKeydown}
    />
  </div>

  <div class="modal-actions">
    <div class="modal-actions__row modal-actions__row--right">
      <Button on:click={handleCancel}>{cancelLabel}</Button>
      <div class="preview-button-group">
        <Button
          bind:element={previewButtonElement}
          on:click={() => handleLoad()}
          disabled={isLoading}
          positive
        >
          {confirmLabel}
        </Button>
        {#if hasRecommendedBuilds}
          <Button
            on:click={handleDropdownClick}
            disabled={isLoading}
            positive
            class="dropdown-button"
            icon={CaretDownIcon}
            tooltipText="Show recommended builds"
            aria-label="Show recommended builds"
          />
        {/if}
      </div>
    </div>
  </div>
</div>

{#if hasRecommendedBuilds}
  <div
    use:portal
    class="dropdown-menu-portal"
    class:menu-open={dropdownMenuOpen}
  >
    <ContextMenu
      x={dropdownMenuX}
      y={dropdownMenuY}
      isOpen={dropdownMenuOpen}
      title="Recommended Builds"
      onClose={closeDropdownMenu}
    >
      {#each recommendedBuilds as build}
        <Button
          icon={recommendedBuildIcons[build.name] ?? ShareNetworkIcon}
          on:click={() => handleRecommendedClick(build.code)}
          disabled={isLoading}
        >
          Preview {build.name} build
        </Button>
      {/each}
    </ContextMenu>
  </div>
{/if}

<style>
  .modal-content {
    display: grid;
    gap: 12px;
    padding: 10px;
  }

  .modal-header {
    display: flex;
    align-items: center;
  }

  .modal-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.05rem;
    color: #f1f5ff;
    line-height: 1;
  }

  :global(.modal-title-icon) {
    width: 18px;
    height: 18px;
    color: #b9c7ec;
  }

  .modal-message {
    margin: 0;
    font-size: 0.92rem;
    color: #c8d6f7;
    line-height: 1.4;
  }

  .modal-label {
    font-size: 0.85rem;
    color: #b9c7ec;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .modal-input-row {
    display: grid;
    grid-template-columns: minmax(0, 96px) minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }

  .modal-input {
    width: 100%;
    height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(72, 102, 172, 0.6);
    background: rgba(12, 18, 32, 0.9);
    color: #e7efff;
    font-size: 0.96rem;
    padding: 0 10px;
    text-transform: none;
  }

  .modal-input:focus-visible {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }

  .modal-input-row :global(button) {
    height: 44px;
    min-width: 0;
    white-space: nowrap;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
  }

  .modal-actions__row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-actions__row--right {
    justify-content: flex-end;
  }

  .preview-button-group {
    display: flex;
    align-items: stretch;
    gap: 0;
  }

  .preview-button-group :global(button:first-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .preview-button-group :global(button.dropdown-button),
  .preview-button-group :global(.button.dropdown-button) {
    border-top-left-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
    border-left: 1px solid rgba(70, 162, 120, 0.9) !important;
    padding: 0px 8px !important;
    min-width: 0;
  }

  .dropdown-menu-portal {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 101;
  }

  .dropdown-menu-portal.menu-open {
    pointer-events: auto;
  }

  /* Ensure ContextMenu appears above modal (modal z-index is 45) */
  .dropdown-menu-portal :global(.context-menu) {
    z-index: 50;
  }

  .dropdown-menu-portal :global(.context-menu-backdrop) {
    z-index: 49;
  }
</style>
