<script lang="ts">
  import type { ComponentType } from "svelte";
  import { onMount } from "svelte";
  import {
    Clock,
    Download,
    Github,
    Hand,
    Hexagon,
    Menu,
    Mouse,
    MousePointer2,
    Move,
    RotateCcw,
    Share2,
    ZoomIn,
  } from "lucide-svelte";
  import packageInfo from "../../../package.json";
  import Button from "../Button.svelte";
  import InstallPwaButton, {
    ensureInstallListeners,
    subscribeInstallState,
  } from "../buttons/InstallPwaButton.svelte";

  const appName = packageInfo.name;
  const appDescription = packageInfo.description ?? "";
  const appVersion = packageInfo.version ?? "";
  const modalTitleWithVersion = appVersion
    ? `${appName} v${appVersion}`
    : appName ?? "";
  const appIconUrl = `${import.meta.env.BASE_URL}icon.svg`;
  const appGithubUrl = (packageInfo?.app?.sourceUrl ?? undefined) as
    | string
    | undefined;

  const ownerName = packageInfo.author?.name ?? "";
  const ownerUrl = packageInfo.author?.url ?? "";
  const gameName = packageInfo.game?.name ?? "";
  const gameUrl = packageInfo.game?.url ?? "";
  const ownerLink = `<a href="${ownerUrl}" target="_blank" rel="noopener noreferrer">${ownerName}</a>`;
  const gameLink = `<a href="${gameUrl}" target="_blank" rel="noopener noreferrer">${gameName}</a>`;
  const helpMessage = `For ${gameLink} - By ${ownerLink}`;

  type ControlDevice = "pointer" | "touch" | "both";
  type ControlItem = {
    id: string;
    label: string;
    description: string;
    icon: ComponentType;
    device: ControlDevice;
  };

  const controls: ControlItem[] = [
    { id: "pointer-node", label: "Click a node", description: "Add a node level and spend Tech Crystals", icon: MousePointer2, device: "pointer" },
    { id: "pointer-node-menu", label: "Right-click a node", description: "Show node options", icon: MousePointer2, device: "pointer" },
    { id: "pointer-tree-menu", label: "Right-click empty space or tab", description: "Show tree options", icon: MousePointer2, device: "pointer" },
    { id: "pointer-pan", label: "Click and drag", description: "Pan around tree", icon: Move, device: "pointer" },
    { id: "pointer-zoom", label: "Scroll wheel or trackpad", description: "Zoom in and out on tree", icon: Mouse, device: "pointer" },
    { id: "touch-node", label: "Tap a node", description: "Add a node level and spend Tech Crystals", icon: Hand, device: "touch" },
    { id: "touch-node-menu", label: "long press a node", description: "Show node options", icon: Clock, device: "touch" },
    { id: "touch-tree-menu", label: "long press empty space or tab", description: "Show tree options", icon: Clock, device: "touch" },
    { id: "touch-pan", label: "Drag with one finger", description: "Pan around tree", icon: Move, device: "touch" },
    { id: "touch-zoom", label: "Pinch with two fingers", description: "Zoom in and out on tree", icon: ZoomIn, device: "touch" },
    { id: "touch-menu-swipe", label: "Swipe right on side menu", description: "Close side menu", icon: Hand, device: "touch" },
  ];

  let showPointer = true;
  let showTouch = true;
  let canInstall = false;
  let isInstalled = false;

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

  $: pointerControls = controls.filter((c) => c.device !== "touch");
  $: touchControls = controls.filter((c) => c.device !== "pointer");

  onMount(() => {
    detectInputSupport();
    ensureInstallListeners();
    const unsubscribe = subscribeInstallState((state) => {
      canInstall = state.canInstall;
      isInstalled = state.isInstalled;
    });
    return () => unsubscribe();
  });
</script>

<div class="controls-page">
  <header class="controls-header">
    <h2 class="controls-title">{modalTitleWithVersion}</h2>
  </header>
  <div class="controls-intro">
    {#if appDescription}
      <p class="controls-description">{appDescription}</p>
    {/if}
    <p class="controls-message">{@html helpMessage}</p>
  </div>
  <div class="controls-brand">
    <img src={appIconUrl} alt={`${appName || "App"} icon`} class="controls-brand__icon" />
  </div>
  <div class="controls-sections">
    <section class="help-section">
      <h3>On-screen HUD</h3>
      <ul class="control-list">
        <div class="help-shortcut">
          <span class="control-icon" aria-hidden="true">
            <Hexagon fill="currentColor" />
          </span>
          <div class="control-text">
            <p class="control-label">Tech Crystals (Currency)</p>
            <p class="control-desc">View spent and set owned amount</p>
          </div>
        </div>
        <div class="help-shortcut">
          <span class="control-icon" aria-hidden="true"><RotateCcw /></span>
          <div class="control-text">
            <p class="control-label">Reset active tree</p>
            <p class="control-desc">Refund Tech Crystals for tree</p>
          </div>
        </div>
      </ul>
    </section>
    <section class="help-section">
      <h3>Side menu</h3>
      <ul class="control-list">
        <div class="help-shortcut">
          <span class="control-icon" aria-hidden="true"><Menu /></span>
          <div class="control-text">
            <p class="control-label">Side menu button</p>
            <p class="control-desc">Show or hide additional options</p>
          </div>
        </div>
        {#if canInstall && !isInstalled}
          <div class="help-shortcut">
            <span class="control-icon" aria-hidden="true"><Download /></span>
            <div class="control-text">
              <p class="control-label">Install app</p>
              <p class="control-desc">Install the PWA for offline access</p>
            </div>
          </div>
        {/if}
        <div class="help-shortcut">
          <span class="control-icon" aria-hidden="true"><Share2 /></span>
          <div class="control-text">
            <p class="control-label">Share button</p>
            <p class="control-desc">Copy a shareable link of your build</p>
          </div>
        </div>
      </ul>
    </section>
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
  <div class="controls-actions">
    <InstallPwaButton />
    <Button
      icon={Github}
      aria-label="GitHub"
      tooltipText="View source on GitHub"
      on:click={() => {
        window.open(appGithubUrl ?? "https://github.com/shilo", "_blank", "noopener,noreferrer");
      }}
    />
  </div>
</div>

<style>
  .controls-page {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .controls-header {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .controls-title {
    margin: 0;
    font-size: 1.05rem;
    color: #f1f5ff;
    line-height: 1;
  }

  .controls-intro {
    display: grid;
    gap: 0;
    text-align: center;
  }

  .controls-description {
    margin: 0;
    font-size: 0.92rem;
    color: #c8d6f7;
    line-height: 1.4;
  }

  .controls-message {
    margin: 0;
    font-size: 0.9rem;
    color: #c8d6f7;
    line-height: 1.4;
  }

  .controls-message :global(a) {
    color: #a7b7e6;
  }

  .controls-brand {
    display: flex;
    justify-content: center;
  }

  .controls-brand__icon {
    width: 32px;
    height: 32px;
  }

  .controls-sections {
    display: grid;
    gap: 10px;
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

  .help-shortcut,
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

  .controls-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
  }
</style>
