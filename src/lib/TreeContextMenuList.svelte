<script lang="ts">
  import { tooltip } from "./tooltip";

  export let onFocusInView: (() => void) | null = null;

  function handleFocusInViewClick() {
    onFocusInView?.();
  }
</script>

<button
  type="button"
  class="button button-md"
  on:click={handleFocusInViewClick}
  use:tooltip={"Fit nodes in view by resetting zoom and pan."}
>
  Focus in view
</button>
