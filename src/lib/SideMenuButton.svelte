<script lang="ts">
  export let label = "";
  export let onClick: (() => void) | null = null;
  export let disabled = false;
</script>

<button
  class="side-menu-button button-md"
  type="button"
  {disabled}
  on:click={() => onClick?.()}
>
  <slot>{label}</slot>
</button>

<style>
  .side-menu-button {
    border: 1px solid #2c3c61;
    background: rgba(17, 27, 45, 0.7);
    color: #d4e1ff;
    border-radius: 12px;
    text-align: left;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease;
  }

  .side-menu-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .side-menu-button:focus-visible {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }
</style>

