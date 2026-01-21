<script lang="ts">
  import { HelpCircle } from "lucide-svelte";
  import packageInfo from "../../package.json";
  import Button from "./Button.svelte";

  const title = packageInfo.name;
  export let onHelp: (() => void) | null = null;
</script>

<Button
  class="app-title-display"
  type="button"
  aria-label={title}
  on:click={() => onHelp?.()}
>
  {title}
</Button>

<style>
  :global(.app-title-display) {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 8;
    border-radius: 999px !important;
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    font-weight: 600;
    font-size: 0.85rem !important;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    --app-title-display-duration: 5s;
    --app-title-display-fade: 200ms;
    animation: app-title-fade var(--app-title-display-fade) ease-in forwards;
    animation-delay: var(--app-title-display-duration);
  }

  :global(.app-title-icon) {
    width: 16px;
    height: 16px;
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
