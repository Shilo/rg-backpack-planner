<script lang="ts">
  import { tooltip } from "./tooltip";

  export let onFocusInView: (() => void) | null = null;
  export let onResetNodes: (() => void) | null = null;
  export let showResetNodes = false;
</script>

<button
  type="button"
  class="button button-md"
  on:click={() => onFocusInView?.()}
  use:tooltip={"Fit nodes in view by resetting zoom and pan"}
>
  Focus in view
</button>
{#if showResetNodes}
  <button
    type="button"
    class="button button-md"
    on:click={() => onResetNodes?.()}
    use:tooltip={"Revert nodes to level 0 and refund Tech Crystals"}
  >
    Reset
  </button>
{/if}
