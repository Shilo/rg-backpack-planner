<script lang="ts">
  export let onFocusInView: (() => void) | null = null;

  function handleFocusInViewClick() {
    onFocusInView?.();
  }
</script>

<button
  type="button"
  class="button button-md"
  on:click={handleFocusInViewClick}
>
  Focus in view
</button>
