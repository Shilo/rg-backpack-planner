<script lang="ts">
  import packageInfo from "../../package.json";
  import Button from "./Button.svelte";

  const title = packageInfo.name;
  export let onHelp: (() => void) | null = null;
</script>

<Button
  class="app-title-display"
  type="button"
  small
  aria-label={title}
  iconClass="app-title-icon"
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
  }

  :global(.app-title-icon) {
    width: 16px;
    height: 16px;
  }
</style>
