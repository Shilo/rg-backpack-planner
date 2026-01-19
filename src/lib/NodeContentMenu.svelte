<script lang="ts">
  import ContextMenu from "./ContextMenu.svelte";

  export let nodeId = "";
  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onMax: ((id: string) => void) | null = null;
  export let onReset: ((id: string) => void) | null = null;
</script>

<ContextMenu
  {x}
  {y}
  {isOpen}
  title={nodeId ?? "Node actions"}
  ariaLabel="Node actions"
  {onClose}
>
  <button
    type="button"
    class="button button-md"
    on:click={() => onMax?.(nodeId)}
    disabled={!nodeId}
  >
    Max
  </button>
  <button
    type="button"
    class="button button-md"
    on:click={() => onReset?.(nodeId)}
    disabled={!nodeId}
  >
    Reset
  </button>
</ContextMenu>
