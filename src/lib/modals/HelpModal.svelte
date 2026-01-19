<script lang="ts">
  import type { ComponentType } from "svelte";
  import { onMount } from "svelte";
  import {
    Clock,
    Hand,
    Mouse,
    MousePointer2,
    Move,
    ZoomIn,
  } from "lucide-svelte";
  import packageInfo from "../../../package.json";
  import Button from "../Button.svelte";

  export let title = "Help";
  export let titleIcon: ComponentType | null = null;
  export let titleIconClass = "";
  export let titleIconAriaHidden = true;
  export let message: string | undefined = undefined;
  export let confirmLabel = "Close";
  export let onConfirm: (() => void) | null = null;

  const appName = packageInfo.name;
  const appDescription = packageInfo.description ?? "";
  const modalTitle = appName ? `${appName} - ${title}` : title;

  type ControlDevice = "pointer" | "touch" | "both";
  type ControlItem = {
    id: string;
    label: string;
    description: string;
    icon: ComponentType;
    device: ControlDevice;
  };

  const controls: ControlItem[] = [
    {
      id: "pointer-pan",
      label: "Click and drag",
      description: "Pan around the tree.",
      icon: Move,
      device: "pointer",
    },
    {
      id: "pointer-zoom",
      label: "Scroll wheel or trackpad",
      description: "Zoom in and out on the tree.",
      icon: Mouse,
      device: "pointer",
    },
    {
      id: "pointer-node",
      label: "Click a node",
      description: "Increase the node level if available.",
      icon: MousePointer2,
      device: "pointer",
    },
    {
      id: "pointer-node-menu",
      label: "Right-click a node",
      description: "Open node options.",
      icon: MousePointer2,
      device: "pointer",
    },
    {
      id: "pointer-tree-menu",
      label: "Right-click empty space",
      description: "Open tree options for the active tab.",
      icon: MousePointer2,
      device: "pointer",
    },
    {
      id: "pointer-tab-menu",
      label: "Right-click a tab",
      description: "Open tab options.",
      icon: MousePointer2,
      device: "pointer",
    },
    {
      id: "touch-pan",
      label: "Drag with one finger",
      description: "Pan around the tree.",
      icon: Move,
      device: "touch",
    },
    {
      id: "touch-zoom",
      label: "Pinch with two fingers",
      description: "Zoom in and out on the tree.",
      icon: ZoomIn,
      device: "touch",
    },
    {
      id: "touch-node",
      label: "Tap a node",
      description: "Increase the node level if available.",
      icon: Hand,
      device: "touch",
    },
    {
      id: "touch-node-menu",
      label: "Long-press a node",
      description: "Open node options.",
      icon: Clock,
      device: "touch",
    },
    {
      id: "touch-tree-menu",
      label: "Long-press empty space",
      description: "Open tree options for the active tab.",
      icon: Clock,
      device: "touch",
    },
    {
      id: "touch-tab-menu",
      label: "Long-press a tab",
      description: "Open tab options.",
      icon: Clock,
      device: "touch",
    },
    {
      id: "touch-menu-swipe",
      label: "Swipe right on the menu",
      description: "Close the side menu.",
      icon: Hand,
      device: "touch",
    },
  ];

  let showPointer = true;
  let showTouch = true;
  let pointerControls: ControlItem[] = [];
  let touchControls: ControlItem[] = [];

  function detectInputSupport() {
    let supportsTouch = false;
    let supportsPointer = false;
    if (typeof navigator !== "undefined") {
      supportsTouch = (navigator.maxTouchPoints ?? 0) > 0;
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      supportsPointer =
        window.matchMedia("(any-pointer: fine)").matches ||
        window.matchMedia("(pointer: fine)").matches;
      supportsTouch =
        supportsTouch ||
        window.matchMedia("(any-pointer: coarse)").matches ||
        window.matchMedia("(pointer: coarse)").matches;
    }
    if (!supportsTouch && !supportsPointer) {
      supportsPointer = true;
    }
    showPointer = supportsPointer;
    showTouch = supportsTouch;
  }

  $: pointerControls = controls.filter((control) => control.device !== "touch");
  $: touchControls = controls.filter((control) => control.device !== "pointer");

  onMount(() => {
    detectInputSupport();
  });
</script>

<div class="modal-content help-content">
  <header class="modal-header">
    <div class="modal-title">
      {#if titleIcon}
        <svelte:component
          this={titleIcon}
          class={`modal-title-icon ${titleIconClass}`.trim()}
          aria-hidden={titleIconAriaHidden}
        />
      {/if}
      <h2>{modalTitle}</h2>
    </div>
  </header>
  <div class="help-scroll">
    <div class="help-intro">
      {#if appDescription}
        <p class="help-description">{appDescription}</p>
      {/if}
      {#if message}
        <p class="modal-message">{message}</p>
      {/if}
    </div>
    <div class="help-controls">
      {#if showPointer}
        <section class="help-section">
          <h3>Pointer controls</h3>
          <ul class="control-list">
            {#each pointerControls as control (control.id)}
              <li class="control-item">
                <span class="control-icon" aria-hidden="true">
                  <svelte:component this={control.icon} />
                </span>
                <div class="control-text">
                  <p class="control-label">{control.label}</p>
                  <p class="control-desc">{control.description}</p>
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
      {#if showTouch}
        <section class="help-section">
          <h3>Touch controls</h3>
          <ul class="control-list">
            {#each touchControls as control (control.id)}
              <li class="control-item">
                <span class="control-icon" aria-hidden="true">
                  <svelte:component this={control.icon} />
                </span>
                <div class="control-text">
                  <p class="control-label">{control.label}</p>
                  <p class="control-desc">{control.description}</p>
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  </div>
  <div class="modal-actions">
    <Button on:click={() => onConfirm?.()}>{confirmLabel}</Button>
  </div>
</div>

<style>
  .modal-content {
    display: grid;
    gap: 12px;
  }

  .help-content {
    max-height: min(80vh, 520px);
    grid-template-rows: auto minmax(0, 1fr);
    position: relative;
  }

  .help-scroll {
    overflow-y: auto;
    padding-right: 4px;
    padding-bottom: 58px;
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

  .help-intro {
    display: grid;
    gap: 6px;
  }

  .help-app-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #e7efff;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .help-description {
    margin: 0;
    font-size: 0.92rem;
    color: #c8d6f7;
    line-height: 1.4;
  }

  .modal-message {
    margin: 0;
    font-size: 0.9rem;
    color: #c8d6f7;
    line-height: 1.4;
  }

  .help-controls {
    display: grid;
    gap: 16px;
  }

  .help-section h3 {
    margin: 0 0 8px;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #b9c7ec;
  }

  .control-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .control-item {
    display: grid;
    grid-template-columns: 24px 1fr;
    gap: 10px;
    align-items: start;
  }

  .control-icon {
    width: 20px;
    height: 20px;
    color: #d7e2ff;
  }

  .control-icon :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }

  .control-text {
    display: grid;
    gap: 4px;
  }

  .control-label {
    margin: 0;
    font-size: 0.92rem;
    color: #f1f5ff;
  }

  .control-desc {
    margin: 0;
    font-size: 0.85rem;
    color: #b9c7ec;
    line-height: 1.35;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding-top: 12px;
    padding-bottom: 6px;
    background: linear-gradient(
      to bottom,
      rgba(14, 21, 36, 0),
      rgba(14, 21, 36, 0.98) 60%,
      rgba(14, 21, 36, 0.98)
    );
    pointer-events: none;
  }

  .modal-actions :global(button) {
    pointer-events: auto;
  }
</style>
