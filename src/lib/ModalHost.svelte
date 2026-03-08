<script lang="ts">
    import { onDestroy } from "svelte";
    import ConfirmModal from "./modals/ConfirmModal.svelte";
    import InputModal from "./modals/InputModal.svelte";
    import TextInputModal from "./modals/TextInputModal.svelte";
    import LoadBuildModal from "./modals/LoadBuildModal.svelte";
    import { get } from "svelte/store";
import { closeModal, modalStore } from "./modalStore";
    import { triggerHaptic } from "./hapticsStore";
    import {
        dismissFocusedTextEntryWithin,
        shouldIgnoreBackdropTapForKeyboardDismiss,
    } from "./useBackdropTextEntryDismiss";
    import { t } from "svelte-whisper";

    let lastActiveElement: HTMLElement | null = null;
    let isMouseDownOnBackdrop = false;
    let shouldIgnoreBackdropClick = false;

    const unsubscribe = modalStore.subscribe((value) => {
        isMouseDownOnBackdrop = false;
        if (value) {
            lastActiveElement =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;
            requestAnimationFrame(() => {
                const current = get(modalStore);
                if (current?.type === "confirm") {
                    const btn = document.querySelector<HTMLButtonElement>(
                        "[data-modal-confirm]"
                    );
                    btn?.focus();
                }
            });
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
        if (shouldIgnoreBackdropClick) {
            shouldIgnoreBackdropClick = false;
            isMouseDownOnBackdrop = false;
            return;
        }
        if (event.target !== event.currentTarget || !isMouseDownOnBackdrop) {
            isMouseDownOnBackdrop = false;
            return;
        }
        isMouseDownOnBackdrop = false;
        triggerHaptic();
        handleCancel();
    }

    /** True when primary pointer is touch (not mouse), so first backdrop tap should only dismiss keyboard. */
    const isTouch = () => window.matchMedia("(pointer: coarse)").matches;

    function dismissKeyboardFromBackdropTap() {
        if (!$modalStore) return false;
        const didDismissFocusedInput = dismissFocusedTextEntryWithin(".modal-shell");
        if (didDismissFocusedInput) {
            // Touch: first tap dismisses keyboard only; mouse: same click closes modal.
            if (isTouch()) {
                shouldIgnoreBackdropClick = true;
                isMouseDownOnBackdrop = false;
                return true;
            }
            return false;
        }
        if (!shouldIgnoreBackdropTapForKeyboardDismiss()) {
            return false;
        }
        shouldIgnoreBackdropClick = true;
        isMouseDownOnBackdrop = false;
        return true;
    }

    function handleBackdropPointerDown(event: PointerEvent) {
        isMouseDownOnBackdrop = event.target === event.currentTarget;
        if (!isMouseDownOnBackdrop) return;
        dismissKeyboardFromBackdropTap();
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
            event.stopImmediatePropagation();
            if (!triggerModalAction("[data-modal-cancel]")) {
                handleCancel();
            }
            return;
        }

        if (event.key === "Enter") {
            const active = document.activeElement;
            if (
                active instanceof HTMLButtonElement &&
                active.getAttribute("data-modal-confirm") !== null
            ) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            const triggered = triggerModalAction("[data-modal-confirm]");
            if (!triggered) {
                const confirmBtn = document.querySelector("[data-modal-confirm]");
                if (!confirmBtn) {
                    handleConfirm();
                }
            }
        }
    }
</script>

<svelte:window on:keydown|capture={handleKeydown} />

{#if $modalStore}
    <div
        class="modal-backdrop"
        role="button"
        tabindex="0"
        aria-label={$t("common.close")}
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
                    confirmLabel={$modalStore.confirmLabel ??
                        $t("modal.confirmLabel")}
                    cancelLabel={$modalStore.cancelLabel ??
                        $t("modal.cancelLabel")}
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
                    label={$modalStore.input?.label ?? $t("modal.valueLabel")}
                    value={$modalStore.input?.value ?? 0}
                    min={$modalStore.input?.min ?? 0}
                    step={$modalStore.input?.step ?? 1}
                    footerButton={$modalStore.inputFooterButton ?? null}
                    confirmLabel={$modalStore.confirmLabel ??
                        $t("modal.saveLabel")}
                    cancelLabel={$modalStore.cancelLabel ??
                        $t("modal.cancelLabel")}
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
                    label={$modalStore.textInput?.label ??
                        $t("modal.valueLabel")}
                    value={$modalStore.textInput?.value ?? ""}
                    maxLength={$modalStore.textInput?.maxLength ?? 25}
                    placeholder={$modalStore.textInput?.placeholder ?? ""}
                    confirmLabel={$modalStore.confirmLabel ??
                        $t("modal.saveLabel")}
                    cancelLabel={$modalStore.cancelLabel ??
                        $t("modal.cancelLabel")}
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
                    confirmLabel={$modalStore.confirmLabel ??
                        $t("modal.previewBuildLabel")}
                    cancelLabel={$modalStore.cancelLabel ??
                        $t("modal.cancelLabel")}
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
        left: 0;
        top: var(--vv-offset-top, 0px);
        width: 100%;
        height: var(--vv-height, 100vh);
        background: var(--backdrop-overlay);
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow-x: auto;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        padding: calc(var(--spacing-lg) + var(--safe-top, 0px))
            calc(var(--spacing-lg) + var(--safe-right, 0px))
            calc(var(--spacing-lg) + var(--safe-bottom, 0px))
            calc(var(--spacing-lg) + var(--safe-left, 0px));
        z-index: var(--z-index-modal);
    }

    .modal-shell {
        margin-top: auto;
        margin-bottom: auto;
        flex-shrink: 0;
        min-width: 0;
        /* Use same proportion of viewport as height: 92vw, capped by backdrop content area */
        width: min(92vw, 100%);
        max-width: 100%;
        max-height: 100%;
        border-radius: var(--radius);
        background: var(--bg-panel);
        border: var(--border-width) solid
            color-mix(
                in srgb,
                color-mix(in srgb, var(--accent) 55%, var(--border)) 50%,
                transparent
            );
        box-shadow: var(--shadow);
        padding: 0;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        display: grid;
        gap: var(--spacing-lg);
    }
</style>
