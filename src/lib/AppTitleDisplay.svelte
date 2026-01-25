<script lang="ts">
  import packageInfo from "../../package.json";
  import Button from "./Button.svelte";

  const title = packageInfo.name;
  const version = packageInfo.version ?? "";
  const titleWithVersion = version ? `${title} v${version}` : title;
</script>

<Button
  class="app-title-display"
  type="button"
  aria-label={titleWithVersion}
>
  {titleWithVersion}
</Button>

<style>
  :global(.app-title-display) {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 8;
    border-radius: 999px !important;
    font-weight: 600;
    font-size: 0.85rem !important;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 12px;
    --app-title-display-duration: 5s;
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
