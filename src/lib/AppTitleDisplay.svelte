<script lang="ts">
  import { HelpCircle } from "lucide-svelte";
  import packageInfo from "../../package.json";
  import Button from "./Button.svelte";

  const title = packageInfo.name;
</script>

<Button
  class="app-title-display"
  type="button"
  small
  aria-label={title}
  icon={HelpCircle}
  iconClass="app-title-icon"
>
  {title}
</Button>

<style>
  :global(.app-title-display) {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 6;
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
