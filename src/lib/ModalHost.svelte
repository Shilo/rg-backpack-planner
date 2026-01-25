<script lang="ts">
  import { onDestroy } from "svelte";
  import ConfirmModal from "./modals/ConfirmModal.svelte";
  import InputModal from "./modals/InputModal.svelte";
  import { closeModal, modalStore } from "./modalStore";
  import { triggerHaptic } from "./haptics";

  let lastActiveElement: HTMLElement | null = null;

  const unsubscribe = modalStore.subscribe((value) => {
    if (value) {
      lastActiveElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      return;
    }

    lastActiveElement?.focus?.();
    lastActiveElement = null;
  });

  onDestroy(() => {
    unsubscribe();
  });

  function handleCancel() {
    const payload = $modalStore;
    if (!payload) return;
    closeModal();
    queueMicrotask(() => {
      payload.onCancel?.();
    });
  }

  function handleConfirm(value?: number) {
    const payload = $modalStore;
    if (!payload) return;
    closeModal();
    queueMicrotask(() => {
      payload.onConfirm?.(value);
    });
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target !== event.currentTarget) return;
    triggerHaptic();
    handleCancel();
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleCancel();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !$modalStore) return;
    event.preventDefault();
    handleCancel();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $modalStore}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Close modal"
    on:click={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
  >
    <div
      class="modal-shell"
      role="dialog"
      aria-modal="true"
      aria-label={$modalStore.title}
    >
      {#if $modalStore.type === "confirm"}
        <ConfirmModal
          title={$modalStore.title}
          titleIcon={$modalStore.titleIcon ?? null}
          titleIconClass={$modalStore.titleIconClass ?? ""}
          message={$modalStore.message}
          confirmLabel={$modalStore.confirmLabel ?? "Confirm"}
          cancelLabel={$modalStore.cancelLabel ?? "Cancel"}
          confirmNegative={$modalStore.confirmNegative ?? false}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      {:else if $modalStore.type === "input"}
        <InputModal
          title={$modalStore.title}
          titleIcon={$modalStore.titleIcon ?? null}
          titleIconClass={$modalStore.titleIconClass ?? ""}
          message={$modalStore.message}
          label={$modalStore.input?.label ?? "Value"}
          value={$modalStore.input?.value ?? 0}
          min={$modalStore.input?.min ?? 0}
          step={$modalStore.input?.step ?? 1}
          confirmLabel={$modalStore.confirmLabel ?? "Save"}
          cancelLabel={$modalStore.cancelLabel ?? "Cancel"}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(6, 9, 18, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 45;
  }

  .modal-shell {
    width: min(92vw, 380px);
    border-radius: 16px;
    background: rgba(14, 21, 36, 0.98);
    border: 1px solid rgba(82, 112, 189, 0.5);
    box-shadow: 0 20px 40px rgba(6, 9, 18, 0.55);
    padding: 0;
    overflow: hidden;
    display: grid;
    gap: 14px;
  }

  @media (max-width: 480px) {
    .modal-shell {
      width: min(92vw, 340px);
      padding: 0;
    }
  }
</style>
