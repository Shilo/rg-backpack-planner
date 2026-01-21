<script lang="ts">
  import type { ComponentType } from "svelte";
  import Button from "../Button.svelte";

  export let title = "";
  export let titleIcon: ComponentType | null = null;
  export let titleIconClass = "";
  export let titleIconAriaHidden = true;
  export let message: string | undefined = undefined;
  export let confirmLabel = "Confirm";
  export let cancelLabel = "Cancel";
  export let onConfirm: (() => void) | null = null;
  export let onCancel: (() => void) | null = null;
</script>

<div class="modal-content">
  <header class="modal-header">
    <div class="modal-title">
      {#if titleIcon}
        <svelte:component
          this={titleIcon}
          class={`modal-title-icon ${titleIconClass}`.trim()}
          aria-hidden={titleIconAriaHidden}
        />
      {/if}
      <h2>{title}</h2>
    </div>
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
    padding: 10px;
  }

  .modal-header {
    display: flex;
    align-items: center;
  }

  .modal-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.05rem;
    color: #f1f5ff;
    line-height: 1;
  }

  :global(.modal-title-icon) {
    width: 18px;
    height: 18px;
    color: #b9c7ec;
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
