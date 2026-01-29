<script lang="ts">
  import { ArrowsOutCardinalIcon } from "phosphor-svelte";
  import type { ComponentType } from "svelte";
  import { onDestroy, onMount } from "svelte";
  import {
    isFullscreenActive,
    isFullscreenSupported,
    toggleFullscreen,
  } from "../fullscreen";
  import { showToast } from "../toast";
  import ToggleSwitch from "../ToggleSwitch.svelte";

  let fullscreenSupported = false;
  let isFullscreen = false;

  function updateFullscreenState() {
    isFullscreen = isFullscreenActive();
  }

  async function handleToggleFullscreen() {
    if (!fullscreenSupported) {
      showToast("Fullscreen is not supported by your browser");
      return;
    }

    const success = await toggleFullscreen();

    if (!success) {
      showToast("Could not change fullscreen state", { tone: "negative" });
    }

    updateFullscreenState();
  }

  function handleFullscreenChange() {
    updateFullscreenState();
  }

  onMount(() => {
    if (typeof document === "undefined") return;

    fullscreenSupported = isFullscreenSupported();
    updateFullscreenState();

    document.addEventListener("fullscreenchange", handleFullscreenChange);
  });

  onDestroy(() => {
    if (typeof document === "undefined") return;
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  });
</script>

<ToggleSwitch
  checked={isFullscreen}
  label="Fullscreen"
  ariaLabel="Toggle fullscreen mode"
  tooltipText="Use fullscreen where your browser supports it"
  icon={ArrowsOutCardinalIcon as unknown as ComponentType}
  onToggle={handleToggleFullscreen}
/>
