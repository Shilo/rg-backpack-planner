<script lang="ts">
  import Button from "../Button.svelte";

  export let title = "";
  export let message: string | undefined = undefined;
  export let confirmLabel = "Confirm";
  export let cancelLabel = "Cancel";
  export let onConfirm: (() => void) | null = null;
  export let onCancel: (() => void) | null = null;
</script>

<div class="modal-content">
  <header class="modal-header">
    <h2>{title}</h2>
  </header>
  {#if message}
    <p class="modal-message">{message}</p>
  {/if}
  <div class="modal-actions">
    <Button on:click={() => onCancel?.()} negative>{cancelLabel}</Button>
    <Button on:click={() => onConfirm?.()}>{confirmLabel}</Button>
  </div>
</div>

<style>
  .modal-content {
    display: grid;
    gap: 12px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.05rem;
    color: #f1f5ff;
  }

  .modal-message {
    margin: 0;
    font-size: 0.92rem;
    color: #c8d6f7;
    line-height: 1.4;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
</style>
