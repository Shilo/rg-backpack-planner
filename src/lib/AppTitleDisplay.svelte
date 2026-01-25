<script lang="ts">
  import { onMount } from "svelte";
  import packageInfo from "../../package.json";
  import Button from "./Button.svelte";

  export let onClick: (() => void) | undefined = undefined;
  export let isMenuOpen = false;

  let hideForever = false;
  $: if (isMenuOpen) hideForever = true;

  const title = packageInfo.name;
  const version = packageInfo.version ?? "";
  const titleWithVersion = version ? `${title} v${version}` : title;

  let wrapperElement: HTMLDivElement;

  onMount(() => {
    const button = wrapperElement?.querySelector(".app-title-display") as HTMLElement;
    if (button) {
      const handleAnimationEnd = () => {
        hideForever = true;
      };
      button.addEventListener("animationend", handleAnimationEnd);
      return () => {
        button.removeEventListener("animationend", handleAnimationEnd);
      };
    }
  });
</script>

{#if !hideForever}
  <div class="app-title-display-wrapper" bind:this={wrapperElement}>
    <Button
      class="app-title-display"
      type="button"
      aria-label={titleWithVersion}
      on:click={() => onClick?.()}
    >
      {titleWithVersion}
    </Button>
  </div>
{/if}

<style>
  .app-title-display-wrapper {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 8;
    pointer-events: none;
  }

  :global(.app-title-display) {
    border-radius: 999px !important;
    font-weight: 600;
    font-size: 0.85rem !important;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 12px;
    pointer-events: auto;
    --app-title-display-duration: 2s;
    --app-title-display-fade: 200ms;
    animation: app-title-fade var(--app-title-display-fade) ease-in forwards;
    animation-delay: var(--app-title-display-duration);
  }

  @keyframes app-title-fade {
    0% {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    100% {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
  }
</style>
