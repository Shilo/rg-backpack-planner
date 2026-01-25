<script lang="ts">
  import type { ComponentType } from "svelte";
  import { onMount } from "svelte";
  import {
    ArrowCounterClockwiseIcon,
    DownloadSimpleIcon,
    GithubLogoIcon,
    HandGrabbingIcon,
    HandSwipeRightIcon,
    HandTapIcon,
    HexagonIcon,
    ListIcon,
    MagnifyingGlassPlusIcon,
    MouseLeftClickIcon,
    MouseRightClickIcon,
    MouseScrollIcon,
    ShareNetworkIcon,
    TimerIcon,
  } from "phosphor-svelte";
  import packageInfo from "../../../package.json";
  import Button from "../Button.svelte";
  import SideMenuSection from "../SideMenuSection.svelte";
  import InstallPwaButton, {
    subscribeInstallState,
  } from "../buttons/InstallPwaButton.svelte";

  const appName = packageInfo.name;
  const appDescription = packageInfo.description ?? "";
  const appVersion = packageInfo.version ?? "";
  const appTitleWithVersion = appVersion
    ? `${appName} v${appVersion}`
    : (appName ?? "");
  const appIconUrl = `${import.meta.env.BASE_URL}icon.svg`;
  const appGithubUrl = (packageInfo?.app?.sourceUrl ?? undefined) as
    | string
    | undefined;

  const ownerName = packageInfo.author?.name ?? "";
  const ownerUrl = packageInfo.author?.url ?? "";
  const gameName = packageInfo.game?.name ?? "";
  const gameUrl = packageInfo.game?.url ?? "";
  const ownerLink =
    ownerUrl && ownerName
      ? `<a href="${ownerUrl}" target="_blank" rel="noopener noreferrer">${ownerName}</a>`
      : ownerName || "";
  const gameLink =
    gameUrl && gameName
      ? `<a href="${gameUrl}" target="_blank" rel="noopener noreferrer">${gameName}</a>`
      : gameName || "";
  const helpMessage =
    gameName && ownerName ? `For ${gameLink}<br>By ${ownerLink}` : "";

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
      description: "Add a node level and spend Tech Crystals",
      icon: MouseLeftClickIcon,
      device: "pointer",
    },
    {
      id: "pointer-node-menu",
      label: "Right click a node",
      description: "Show node options",
      icon: MouseRightClickIcon,
      device: "pointer",
    },
    {
      id: "pointer-tree-menu",
      label: "Right click empty space or tab",
      description: "Show tree options",
      icon: MouseRightClickIcon,
      device: "pointer",
    },
    {
      id: "pointer-pan",
      label: "Click and drag",
      description: "Pan around tree",
      icon: HandGrabbingIcon,
      device: "pointer",
    },
    {
      id: "pointer-zoom",
      label: "Scroll wheel or trackpad",
      description: "Zoom in and out on tree",
      icon: MouseScrollIcon,
      device: "pointer",
    },
    {
      id: "touch-node",
      label: "Tap a node",
      description: "Add a node level and spend Tech Crystals",
      icon: HandTapIcon,
      device: "touch",
    },
    {
      id: "touch-node-menu",
      label: "long press a node",
      description: "Show node options",
      icon: TimerIcon,
      device: "touch",
    },
    {
      id: "touch-tree-menu",
      label: "long press empty space or tab",
      description: "Show tree options",
      icon: TimerIcon,
      device: "touch",
    },
    {
      id: "touch-pan",
      label: "Drag with one finger",
      description: "Pan around tree",
      icon: HandGrabbingIcon,
      device: "touch",
    },
    {
      id: "touch-zoom",
      label: "Pinch with two fingers",
      description: "Zoom in and out on tree",
      icon: MagnifyingGlassPlusIcon,
      device: "touch",
    },
    {
      id: "touch-menu-swipe",
      label: "Swipe right on side menu",
      description: "Close side menu",
      icon: HandSwipeRightIcon,
      device: "touch",
    },
  ];

  let showMouse = true;
  let showTouch = true;
  let canInstall = false;
  let isInstalled = false;

  function detectInputSupport() {
    let supportsTouch = false;
    let supportsMouse = false;
    if (typeof navigator !== "undefined") {
      supportsTouch = (navigator.maxTouchPoints ?? 0) > 0;
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      supportsMouse =
        window.matchMedia("(any-pointer: fine)").matches ||
        window.matchMedia("(pointer: fine)").matches;
      supportsTouch =
        supportsTouch ||
        window.matchMedia("(any-pointer: coarse)").matches ||
        window.matchMedia("(pointer: coarse)").matches;
    }
    if (!supportsTouch && !supportsMouse) {
      supportsMouse = true;
    }
    showMouse = supportsMouse;
    showTouch = supportsTouch;
  }

  $: pointerControls = controls.filter((c) => c.device !== "touch");
  $: touchControls = controls.filter((c) => c.device !== "pointer");

  onMount(() => {
    detectInputSupport();
    const unsubscribe = subscribeInstallState((state) => {
      canInstall = state.canInstall;
      isInstalled = state.isInstalled;
    });
    return () => unsubscribe();
  });
</script>

<div class="controls-page">
  <div class="controls-sections">
    <SideMenuSection title={appTitleWithVersion}>
      <div class="app-info-actions">
        <div class="control-row">
          <span class="control-icon" aria-hidden="true">
            <img
              src={appIconUrl}
              alt={`${appName || "App"} icon`}
              class="control-icon__image"
            />
          </span>
          <div class="control-text">
            {#if appDescription}
              <p class="control-label">{appDescription}</p>
            {/if}
            {#if helpMessage}
              <p class="control-desc">{@html helpMessage}</p>
            {/if}
          </div>
        </div>
        <div class="controls-actions">
          <Button
            icon={GithubLogoIcon}
            aria-label="View source on GitHub"
            tooltipText="View source on GitHub"
            on:click={() => {
              window.open(
                appGithubUrl ?? "https://github.com/shilo",
                "_blank",
                "noopener,noreferrer",
              );
            }}
          />
          <InstallPwaButton />
        </div>
      </div>
    </SideMenuSection>
    {#if showTouch}
      <SideMenuSection title="Touch">
        <ul class="control-list">
          {#each touchControls as control (control.id)}
            <li class="control-row">
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
      </SideMenuSection>
    {/if}
    {#if showMouse}
      <SideMenuSection title="Mouse">
        <ul class="control-list">
          {#each pointerControls as control (control.id)}
            <li class="control-row">
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
      </SideMenuSection>
    {/if}
    <SideMenuSection title="On screen HUD">
      <ul class="control-list">
        <li class="control-row">
          <span class="control-icon control-icon-filled" aria-hidden="true">
            <HexagonIcon weight="fill" />
          </span>
          <div class="control-text">
            <p class="control-label">Tech Crystals (Currency)</p>
            <p class="control-desc">View spent and set owned amount</p>
          </div>
        </li>
        <li class="control-row">
          <span class="control-icon" aria-hidden="true"
            ><ArrowCounterClockwiseIcon /></span
          >
          <div class="control-text">
            <p class="control-label">Reset active tree</p>
            <p class="control-desc">Refund Tech Crystals for tree</p>
          </div>
        </li>
      </ul>
    </SideMenuSection>
    <SideMenuSection title="Side menu">
      <ul class="control-list">
        <li class="control-row">
          <span class="control-icon" aria-hidden="true"><ListIcon /></span>
          <div class="control-text">
            <p class="control-label">Side menu button</p>
            <p class="control-desc">Show or hide additional options</p>
          </div>
        </li>
        {#if canInstall && !isInstalled}
          <li class="control-row">
            <span class="control-icon" aria-hidden="true"
              ><DownloadSimpleIcon /></span
            >
            <div class="control-text">
              <p class="control-label">Install app</p>
              <p class="control-desc">Install the PWA for offline access</p>
            </div>
          </li>
        {/if}
        <li class="control-row">
          <span class="control-icon" aria-hidden="true"
            ><ShareNetworkIcon /></span
          >
          <div class="control-text">
            <p class="control-label">Share button</p>
            <p class="control-desc">Copy a shareable link of your build</p>
          </div>
        </li>
      </ul>
    </SideMenuSection>
  </div>
</div>

<style>
  .controls-page {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .controls-sections {
    display: grid;
    gap: 10px;
    min-width: 0;
  }

  .control-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .control-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 6px;
    align-items: start;
  }

  .control-icon {
    width: 20px;
    height: 20px;
    color: #d7e2ff;
  }

  .control-icon :global(svg),
  .control-icon__image {
    width: 100%;
    height: 100%;
    display: block;
  }

  .control-icon__image {
    opacity: 0.85;
    filter: brightness(0) saturate(100%) invert(90%) sepia(5%) saturate(1200%) hue-rotate(195deg) brightness(110%) contrast(90%);
  }

  .control-icon-filled {
    color: #b9c7ec;
  }

  .control-text {
    display: grid;
    gap: 4px;
  }

  .control-label {
    margin: 0;
    font-size: 0.92rem;
    color: #f1f5ff;
    overflow-wrap: break-word;
  }

  .control-desc {
    margin: 0;
    font-size: 0.85rem;
    color: #b9c7ec;
    line-height: 1.35;
    overflow-wrap: break-word;
  }

  .control-desc :global(a) {
    color: #a7b7e6;
  }

  .app-info-actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6px;
  }

  .app-info-actions > .control-row {
    flex: 1;
    min-width: 0;
  }

  .controls-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
  }
</style>
