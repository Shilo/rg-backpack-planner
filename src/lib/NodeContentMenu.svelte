<script lang="ts">
  import ContextMenu from "./ContextMenu.svelte";

  export let nodeId: string | null = null;
  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onMax: ((id: string) => void) | null = null;
  export let onReset: ((id: string) => void) | null = null;

  function handleMax() {
    if (!nodeId) return;
    onMax?.(nodeId);
  }

  function handleReset() {
    if (!nodeId) return;
    onReset?.(nodeId);
  }
</script>

<ContextMenu {x} {y} {isOpen} ariaLabel="Node actions" {onClose}>
  <button type="button" on:click={handleMax} disabled={!nodeId}>Max</button>
  <button type="button" on:click={handleReset} disabled={!nodeId}>Reset</button>
</ContextMenu>
