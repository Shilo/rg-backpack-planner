<script lang="ts">
  import { tooltip } from "./tooltip";

  export let onFocusInView: (() => void) | null = null;
  export let onReset: (() => void) | null = null;
</script>

<button
  type="button"
  class="button button-md"
  on:click={() => onFocusInView?.()}
  use:tooltip={"Fit nodes in view by resetting zoom and pan"}
>
  Focus in view
</button>
<button
  type="button"
  class="button button-md"
  on:click={() => onReset?.()}
  use:tooltip={"Revert nodes to level 0 and refund Tech Crystals"}
>
  Reset tree
</button>
