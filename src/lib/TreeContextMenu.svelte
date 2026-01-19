<script lang="ts">
  import ContextMenu from "./ContextMenu.svelte";

  export let tabId: string | null = null;
  export let tabLabel = "";
  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onCenter: ((tabId: string) => void) | null = null;

  function handleCenter() {
    if (!tabId) return;
    onCenter?.(tabId);
  }
</script>

<ContextMenu
  {x}
  {y}
  {isOpen}
  ariaLabel={`Tab actions${tabLabel ? `: ${tabLabel}` : ""}`}
  {onClose}
>
  <button type="button" on:click={handleCenter} disabled={!tabId}>
    Center view
  </button>
</ContextMenu>
