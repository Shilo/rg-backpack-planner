<script lang="ts">
  import type { ComponentType } from "svelte";
  import { onMount } from "svelte";
  import {
    Clock,
    Hand,
    Hexagon,
    Menu,
    Mouse,
    MousePointer2,
    Move,
    Share2,
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
      id: "pointer-node",
      label: "Click a node",
      description: "Increase node level and spend currency",
      icon: MousePointer2,
      device: "pointer",
    },
    {
      id: "pointer-node-menu",
      label: "Right-click a node",
      description: "Show node options",
      icon: MousePointer2,
      device: "pointer",
    },
    {
      id: "pointer-tree-menu",
      label: "Right-click empty space or tab",
      description: "Show tree options",
      icon: MousePointer2,
      device: "pointer",
    },
    {
      id: "pointer-pan",
      label: "Click and drag",
      description: "Pan around tree",
      icon: Move,
      device: "pointer",
    },
    {
      id: "pointer-zoom",
      label: "Scroll wheel or trackpad",
      description: "Zoom in and out on tree",
      icon: Mouse,
      device: "pointer",
    },
    {
      id: "touch-node",
      label: "Tap a node",
      description: "Increase node level and spend currency",
      icon: Hand,
      device: "touch",
    },
    {
      id: "touch-node-menu",
      label: "long press a node",
      description: "Show node options",
      icon: Clock,
      device: "touch",
    },
    {
      id: "touch-tree-menu",
      label: "long press empty space or tab",
      description: "Show tree options",
      icon: Clock,
      device: "touch",
    },
    {
      id: "touch-pan",
      label: "Drag with one finger",
      description: "Pan around tree",
      icon: Move,
      device: "touch",
    },
    {
      id: "touch-zoom",
      label: "Pinch with two fingers",
      description: "Zoom in and out on tree",
      icon: ZoomIn,
      device: "touch",
    },
    {
      id: "touch-menu-swipe",
      label: "Swipe right on side menu",
      description: "Close side menu",
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
      <section class="help-section">
        <h3>On-screen HUD</h3>
        <ul class="control-list">
          <div class="help-shortcut">
            <span class="control-icon" aria-hidden="true">
              <Hexagon />
            </span>
            <div class="control-text">
              <p class="control-label">Tech Crystals (Currency)</p>
              <p class="control-desc">View spent and set owned amount</p>
            </div>
          </div>
        </ul>
      </section>
      <section class="help-section">
        <h3>Side menu</h3>
        <ul class="control-list">
          <div class="help-shortcut">
            <span class="control-icon" aria-hidden="true">
              <Menu />
            </span>
            <div class="control-text">
              <p class="control-label">Side menu button</p>
              <p class="control-desc">Show or hide additional options</p>
            </div>
          </div>
          <div class="help-shortcut">
            <span class="control-icon" aria-hidden="true">
              <Share2 />
            </span>
            <div class="control-text">
              <p class="control-label">Share button</p>
              <p class="control-desc">Copy a shareable build link</p>
            </div>
          </div>
        </ul>
      </section>
      {#if true}
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
      {#if showPointer}
        <section class="help-section">
          <h3>Mouse controls</h3>
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
    max-height: min(80dvh, 520px);
    grid-template-rows: auto minmax(0, 1fr);
    position: relative;
  }

  .help-scroll {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    padding: 0 2px 46px;
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
    gap: 0px;
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
    gap: 10px;
  }

  .help-shortcut {
    display: grid;
    grid-template-columns: 24px 1fr;
    gap: 10px;
    align-items: start;
  }

  .help-section h3 {
    margin: 0 0 6px;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #b9c7ec;
  }

  .help-section + .help-section {
    margin-top: 2px;
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
