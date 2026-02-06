<script lang="ts">
    import { onDestroy } from "svelte";
    import ConfirmModal from "./modals/ConfirmModal.svelte";
    import InputModal from "./modals/InputModal.svelte";
    import TextInputModal from "./modals/TextInputModal.svelte";
    // @ts-ignore - Svelte component import
    import LoadBuildModal from "./modals/LoadBuildModal.svelte";
    import { closeModal, modalStore } from "./modalStore";
    import { triggerHaptic } from "./haptics";

    let lastActiveElement: HTMLElement | null = null;
    let isMouseDownOnBackdrop = false;

    const unsubscribe = modalStore.subscribe((value) => {
        isMouseDownOnBackdrop = false;
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

    function handleConfirm(value?: string | number) {
        const payload = $modalStore;
        if (!payload) return;
        closeModal();
        queueMicrotask(() => {
            payload.onConfirm?.(value);
        });
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target !== event.currentTarget || !isMouseDownOnBackdrop) {
            isMouseDownOnBackdrop = false;
            return;
        }
        isMouseDownOnBackdrop = false;
        triggerHaptic();
        handleCancel();
    }

    function handleBackdropPointerDown(event: PointerEvent) {
        isMouseDownOnBackdrop = event.target === event.currentTarget;
    }

    function handleBackdropKeydown(event: KeyboardEvent) {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleCancel();
    }

    function triggerModalAction(selector: string) {
        const button = document.querySelector<HTMLButtonElement>(selector);
        if (!button || button.disabled) return false;
        button.click();
        return true;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!$modalStore) return;

        if (event.key === "Escape") {
            event.preventDefault();
            if (!triggerModalAction("[data-modal-cancel]")) {
                handleCancel();
            }
            return;
        }

        if (event.key === "Enter") {
            if (document.activeElement instanceof HTMLButtonElement) return;
            event.preventDefault();
            if (!triggerModalAction("[data-modal-confirm]")) {
                handleConfirm();
            }
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $modalStore}
    <div
        class="modal-backdrop"
        role="button"
        tabindex="0"
        aria-label="Close modal"
        on:pointerdown={handleBackdropPointerDown}
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
                    titleIconWeight={$modalStore.titleIconWeight}
                    message={$modalStore.message}
                    confirmLabel={$modalStore.confirmLabel ?? "Confirm"}
                    cancelLabel={$modalStore.cancelLabel ?? "Cancel"}
                    confirmNegative={$modalStore.confirmNegative ?? false}
                    confirmPositive={$modalStore.confirmPositive ?? false}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            {:else if $modalStore.type === "input"}
                <InputModal
                    title={$modalStore.title}
                    titleIcon={$modalStore.titleIcon ?? null}
                    titleIconClass={$modalStore.titleIconClass ?? ""}
                    titleIconWeight={$modalStore.titleIconWeight}
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
            {:else if $modalStore.type === "textInput"}
                <TextInputModal
                    title={$modalStore.title}
                    titleIcon={$modalStore.titleIcon ?? null}
                    titleIconClass={$modalStore.titleIconClass ?? ""}
                    titleIconWeight={$modalStore.titleIconWeight}
                    message={$modalStore.message}
                    label={$modalStore.textInput?.label ?? "Value"}
                    value={$modalStore.textInput?.value ?? ""}
                    maxLength={$modalStore.textInput?.maxLength ?? 25}
                    placeholder={$modalStore.textInput?.placeholder ?? ""}
                    confirmLabel={$modalStore.confirmLabel ?? "Save"}
                    cancelLabel={$modalStore.cancelLabel ?? "Cancel"}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            {:else if $modalStore.type === "loadBuild"}
                <LoadBuildModal
                    title={$modalStore.title}
                    titleIcon={$modalStore.titleIcon ?? null}
                    titleIconClass={$modalStore.titleIconClass ?? ""}
                    titleIconWeight={$modalStore.titleIconWeight}
                    message={$modalStore.message}
                    confirmLabel={$modalStore.confirmLabel ?? "Preview build"}
                    cancelLabel={$modalStore.cancelLabel ?? "Cancel"}
                    onLoaded={() => handleConfirm()}
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
        background: var(--color-modal-backdrop);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        z-index: var(--z-index-modal);
    }

    .modal-shell {
        width: min(92vw, 380px);
        border-radius: var(--radius-lg);
        background: var(--color-modal-bg);
        border: 1px solid var(--color-modal-border);
        box-shadow: var(--shadow-modal);
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
