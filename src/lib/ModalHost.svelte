<script lang="ts">
    import { onDestroy } from "svelte";
    import { cubicOut } from "svelte/easing";
    import { fade, type TransitionConfig } from "svelte/transition";
    import ConfirmModal from "./modals/ConfirmModal.svelte";
    import InputModal from "./modals/InputModal.svelte";
    import TextInputModal from "./modals/TextInputModal.svelte";
    import LoadBuildModal from "./modals/LoadBuildModal.svelte";
    import ResetTreeChoicesModal from "./modals/ResetTreeChoicesModal.svelte";
    import { get } from "svelte/store";
    import { closeModal, modalStore, type ModalPayload } from "./modalStore";
    import { triggerHaptic } from "./hapticsStore";
    import {
        dismissFocusedTextEntryWithin,
        shouldIgnoreBackdropTapForKeyboardDismiss,
    } from "./useBackdropTextEntryDismiss";
    import { t } from "svelte-whisper";

    let lastActiveElement: HTMLElement | null = null;
    let isMouseDownOnBackdrop = false;
    let shouldIgnoreBackdropClick = false;
    let renderedModal: ModalPayload | null = null;

    const unsubscribe = modalStore.subscribe((value) => {
        isMouseDownOnBackdrop = false;
        if (value) {
            renderedModal = value;
            lastActiveElement =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;
            requestAnimationFrame(() => {
                const current = get(modalStore) ?? renderedModal;
                const focusSelector =
                    current?.type === "confirm"
                        ? "[data-modal-confirm]"
                        : current?.type === "resetTreeChoices"
                          ? "[data-modal-choice]:not(:disabled)"
                          : null;
                if (focusSelector) {
                    const btn = document.querySelector<HTMLButtonElement>(
                        focusSelector,
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
        const payload = renderedModal;
        if (!payload) return;
        closeModal();
        queueMicrotask(() => {
            payload.onCancel?.();
        });
    }

    function handleConfirm(value?: string | number) {
        const payload = renderedModal;
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
        if (!renderedModal) return false;
        const didDismissFocusedInput =
            dismissFocusedTextEntryWithin(".modal-shell");
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

    const FOCUSABLE_SELECTOR =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusables(container: Element): HTMLElement[] {
        const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        return Array.from(nodes).filter(
            (el) =>
                el.offsetParent !== null &&
                getComputedStyle(el).visibility !== "hidden",
        );
    }

    function handleModalTabKeydown(event: KeyboardEvent) {
        if (event.key !== "Tab" || !renderedModal) return;
        const backdrop = document.querySelector(".modal-backdrop");
        if (!backdrop || !backdrop.contains(document.activeElement)) return;

        const focusables = getFocusables(backdrop);
        if (focusables.length === 0) return;

        const active = document.activeElement;
        const currentIndex =
            active instanceof HTMLElement
                ? focusables.indexOf(active)
                : -1;

        let nextIndex: number;
        if (event.shiftKey) {
            nextIndex =
                currentIndex <= 0
                    ? focusables.length - 1
                    : currentIndex - 1;
        } else {
            nextIndex =
                currentIndex < 0 || currentIndex >= focusables.length - 1
                    ? 0
                    : currentIndex + 1;
        }

        event.preventDefault();
        event.stopPropagation();
        focusables[nextIndex]?.focus();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!renderedModal) return;

        if (event.key === "Tab") {
            handleModalTabKeydown(event);
            return;
        }

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
                renderedModal.type === "resetTreeChoices" &&
                active instanceof HTMLButtonElement &&
                active.closest(".modal-shell")
            ) {
                return;
            }
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
                const confirmBtn = document.querySelector(
                    "[data-modal-confirm]",
                );
                if (!confirmBtn) {
                    handleConfirm();
                }
            }
        }
    }

    function modalShellTransition(
        _node: Element,
        params: { sheet?: boolean } = {},
    ): TransitionConfig {
        const isSheet = params.sheet ?? false;

        // Swipe-dismiss already animated the sheet off-screen; skip the Svelte outro.
        if (isSheet && sheetSwipeDismissing) {
            return { duration: 0 };
        }

        const distance = isSheet ? 32 : 8;
        const startScale = isSheet ? 1 : 0.96;

        return {
            duration: isSheet ? 220 : 160,
            easing: cubicOut,
            css: (t, u) => `
                opacity: ${t};
                transform: translate3d(0, ${u * distance}px, 0) scale(${startScale + (1 - startScale) * t});
            `,
        };
    }

    function handleBackdropOutroEnd() {
        if ($modalStore) return;
        renderedModal = null;
        sheetSwipeDismissing = false;
        resetSheetDragStyles();
    }

    // ── Sheet swipe-to-close ──────────────────────────────────────────
    let sheetShellRef: HTMLDivElement | null = null;
    let sheetSwipeDismissing = false;
    let sheetDragStartX = 0;
    let sheetDragStartY = 0;
    let sheetDragOffset = 0;
    let sheetDragActiveTime = 0;
    let sheetDragging = false;
    let sheetDragPointerId: number | null = null;
    let sheetDragSuppressClick = false;

    const SHEET_DRAG_THRESHOLD = 10;
    const SHEET_DISMISS_DISTANCE = 80;
    const SHEET_DISMISS_VELOCITY = 500;

    function handleSheetPointerDown(event: PointerEvent) {
        if (renderedModal?.type !== "resetTreeChoices") return;
        if (sheetDragPointerId !== null) return;
        sheetDragStartX = event.clientX;
        sheetDragStartY = event.clientY;
        sheetDragOffset = 0;
        sheetDragActiveTime = 0;
        sheetDragging = false;
        sheetDragPointerId = event.pointerId;
    }

    function handleSheetPointerMove(event: PointerEvent) {
        if (event.pointerId !== sheetDragPointerId) return;
        const dy = event.clientY - sheetDragStartY;
        const dx = event.clientX - sheetDragStartX;

        if (!sheetDragging) {
            // Horizontal movement dominates — not a swipe-down
            if (Math.abs(dx) > Math.abs(dy)) {
                sheetDragPointerId = null;
                return;
            }
            if (dy < SHEET_DRAG_THRESHOLD) return;
            // Don't drag if the sheet content is scrolled
            if (sheetShellRef && sheetShellRef.scrollTop > 0) {
                sheetDragPointerId = null;
                return;
            }
            sheetDragging = true;
            sheetDragActiveTime = event.timeStamp;
            (event.currentTarget as HTMLElement).setPointerCapture(
                event.pointerId,
            );
            // Hide scrollbars while the sheet is being dragged / animated out
            if (sheetShellRef) sheetShellRef.style.overflow = "hidden";
            const bg = sheetShellRef?.parentElement;
            if (bg) bg.style.overflow = "hidden";
        }

        sheetDragOffset = Math.max(0, dy);
        if (sheetShellRef) {
            sheetShellRef.style.transform = `translate3d(0, ${sheetDragOffset}px, 0)`;
            sheetShellRef.style.transition = "none";
            const backdrop = sheetShellRef.parentElement;
            if (backdrop) {
                const progress = Math.min(sheetDragOffset / 300, 1);
                backdrop.style.opacity = String(1 - progress * 0.6);
            }
        }
    }

    function handleSheetPointerEnd(event: PointerEvent) {
        if (event.pointerId !== sheetDragPointerId) return;
        sheetDragPointerId = null;

        if (!sheetDragging) return;

        const elapsed =
            Math.max(1, event.timeStamp - sheetDragActiveTime) / 1000;
        const velocity = sheetDragOffset / elapsed;
        const shouldDismiss =
            sheetDragOffset > SHEET_DISMISS_DISTANCE ||
            velocity > SHEET_DISMISS_VELOCITY;

        sheetDragging = false;
        sheetDragSuppressClick = true;
        setTimeout(() => {
            sheetDragSuppressClick = false;
        }, 300);

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (shouldDismiss) {
            if (reducedMotion) {
                resetSheetDragStyles();
                sheetSwipeDismissing = true;
                triggerHaptic();
                handleCancel();
                return;
            }
            if (sheetShellRef) {
                sheetShellRef.style.transition =
                    "transform 150ms cubic-bezier(0.4, 0, 1, 1)";
                sheetShellRef.style.transform = "translate3d(0, 100%, 0)";
            }
            const backdrop = sheetShellRef?.parentElement;
            if (backdrop) {
                backdrop.style.transition = "opacity 150ms ease-out";
                backdrop.style.opacity = "0";
            }
            setTimeout(() => {
                sheetSwipeDismissing = true;
                triggerHaptic();
                handleCancel();
            }, 150);
        } else {
            if (sheetShellRef) {
                sheetShellRef.style.transition =
                    "transform 200ms cubic-bezier(0.2, 0, 0, 1)";
                sheetShellRef.style.transform = "";
            }
            const backdrop = sheetShellRef?.parentElement;
            if (backdrop) {
                backdrop.style.transition = "opacity 200ms ease-out";
                backdrop.style.opacity = "";
            }
            setTimeout(() => resetSheetDragStyles(), 200);
        }
    }

    function resetSheetDragStyles() {
        if (sheetShellRef) {
            sheetShellRef.style.transform = "";
            sheetShellRef.style.transition = "";
            sheetShellRef.style.overflow = "";
        }
        const backdrop = sheetShellRef?.parentElement;
        if (backdrop) {
            backdrop.style.opacity = "";
            backdrop.style.transition = "";
            backdrop.style.overflow = "";
        }
    }

    function handleSheetDragClick(event: MouseEvent) {
        if (sheetDragSuppressClick) {
            event.stopPropagation();
            event.preventDefault();
            sheetDragSuppressClick = false;
        }
    }
</script>

<svelte:window on:keydown|capture={handleKeydown} />

{#if $modalStore && renderedModal}
    <div
        class="modal-backdrop"
        class:modal-backdrop--sheet={renderedModal.type === "resetTreeChoices"}
        role="button"
        tabindex="0"
        aria-label={$t("common.close")}
        transition:fade={{ duration: sheetSwipeDismissing ? 0 : 140 }}
        on:outroend={handleBackdropOutroEnd}
        on:pointerdown={handleBackdropPointerDown}
        on:click={handleBackdropClick}
        on:keydown={handleBackdropKeydown}
    >
        <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
        <div
            class="modal-shell"
            class:modal-shell--confirm={renderedModal.type === "confirm"}
            class:modal-shell--input={renderedModal.type === "input"}
            class:modal-shell--textInput={renderedModal.type === "textInput"}
            class:modal-shell--resetTreeChoices={renderedModal.type === "resetTreeChoices"}
            bind:this={sheetShellRef}
            role="dialog"
            tabindex="-1"
            aria-modal="true"
            aria-label={renderedModal.title}
            transition:modalShellTransition={{ sheet: renderedModal.type === "resetTreeChoices" }}
            on:pointerdown={handleSheetPointerDown}
            on:pointermove={handleSheetPointerMove}
            on:pointerup={handleSheetPointerEnd}
            on:pointercancel={handleSheetPointerEnd}
            on:click|capture={handleSheetDragClick}
        >
            {#if renderedModal.type === "confirm"}
                <ConfirmModal
                    title={renderedModal.title}
                    titleIcon={renderedModal.titleIcon ?? null}
                    titleIconClass={renderedModal.titleIconClass ?? ""}
                    titleIconWeight={renderedModal.titleIconWeight}
                    message={renderedModal.message}
                    confirmLabel={renderedModal.confirmLabel ??
                        $t("modal.confirmLabel")}
                    cancelLabel={renderedModal.cancelLabel ??
                        $t("modal.cancelLabel")}
                    confirmNegative={renderedModal.confirmNegative ?? false}
                    confirmPositive={renderedModal.confirmPositive ?? false}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            {:else if renderedModal.type === "input"}
                <InputModal
                    title={renderedModal.title}
                    titleIcon={renderedModal.titleIcon ?? null}
                    titleIconClass={renderedModal.titleIconClass ?? ""}
                    titleIconWeight={renderedModal.titleIconWeight}
                    message={renderedModal.message}
                    label={renderedModal.input?.label ?? $t("modal.valueLabel")}
                    value={renderedModal.input?.value ?? 0}
                    min={renderedModal.input?.min ?? 0}
                    step={renderedModal.input?.step ?? 1}
                    footerButton={renderedModal.inputFooterButton ?? null}
                    confirmLabel={renderedModal.confirmLabel ??
                        $t("modal.saveLabel")}
                    cancelLabel={renderedModal.cancelLabel ??
                        $t("modal.cancelLabel")}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            {:else if renderedModal.type === "textInput"}
                <TextInputModal
                    title={renderedModal.title}
                    titleIcon={renderedModal.titleIcon ?? null}
                    titleIconClass={renderedModal.titleIconClass ?? ""}
                    titleIconWeight={renderedModal.titleIconWeight}
                    message={renderedModal.message}
                    label={renderedModal.textInput?.label ??
                        $t("modal.valueLabel")}
                    value={renderedModal.textInput?.value ?? ""}
                    maxLength={renderedModal.textInput?.maxLength ?? 25}
                    placeholder={renderedModal.textInput?.placeholder ?? ""}
                    confirmLabel={renderedModal.confirmLabel ??
                        $t("modal.saveLabel")}
                    cancelLabel={renderedModal.cancelLabel ??
                        $t("modal.cancelLabel")}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            {:else if renderedModal.type === "loadBuild"}
                <LoadBuildModal
                    title={renderedModal.title}
                    titleIcon={renderedModal.titleIcon ?? null}
                    titleIconClass={renderedModal.titleIconClass ?? ""}
                    titleIconWeight={renderedModal.titleIconWeight}
                    message={renderedModal.message}
                    confirmLabel={renderedModal.confirmLabel ??
                        $t("modal.previewBuildLabel")}
                    cancelLabel={renderedModal.cancelLabel ??
                        $t("modal.cancelLabel")}
                    onLoaded={() => handleConfirm()}
                    onCancel={handleCancel}
                />
            {:else if renderedModal.type === "resetTreeChoices"}
                <ResetTreeChoicesModal
                    title={renderedModal.title}
                    sheetIcon={renderedModal.sheetIcon ?? null}
                    message={renderedModal.message}
                    choices={renderedModal.resetTreeChoices?.choices ?? []}
                    cancelLabel={renderedModal.cancelLabel ??
                        $t("modal.cancelLabel")}
                    onConfirm={(value) => handleConfirm(value)}
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
        backdrop-filter: blur(var(--blur-md));
        -webkit-backdrop-filter: blur(var(--blur-md));
    }

    .modal-backdrop--sheet {
        background: color-mix(
            in srgb,
            var(--backdrop-overlay-heavy) 92%,
            transparent
        );
    }

    /* Dialog container: centered, scrollable, width from content up to viewport cap */
    .modal-shell {
        margin-top: auto;
        margin-bottom: auto;
        flex-shrink: 0;
        /* At least 380px (or 92vw on narrow viewports); scales with rem but not below 1x size */
        min-width: max(380px, min(92vw, 23.75rem));
        /* Cap at 92vw or 100% of container so it never overflows */
        max-width: min(92vw, 100%);
        max-height: 100%;
        width: max-content;
        border-radius: var(--radius);
        background: var(--bg-panel);
        border: var(--border-width) solid
            color-mix(
                in srgb,
                color-mix(in srgb, var(--accent) 55%, var(--border)) 50%,
                transparent
            );
        box-shadow: var(--shadow), var(--shadow-lg);
        padding: 0;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        display: grid;
        gap: var(--spacing-lg);
    }

    /* Confirm, number input, and text input modals: narrower shell, scales with font, floor at 320px */
    .modal-shell--confirm,
    .modal-shell--input,
    .modal-shell--textInput {
        min-width: max(320px, min(92vw, 20rem));
        max-width: max(320px, min(20rem, 100%));
    }

    .modal-shell--resetTreeChoices {
        min-width: 0;
        width: min(100%, 40rem);
        max-width: min(
            40rem,
            calc(
                100vw - 2 * var(--spacing-lg) - var(--safe-left, 0px) -
                    var(--safe-right, 0px)
            )
        );
        max-height: min(
            42rem,
            calc(100% - max(3.5rem, calc(var(--safe-top, 0px) + 1rem)))
        );
        margin-bottom: 0;
        gap: 0;
        border-radius: 28px;
        background:
            linear-gradient(
                180deg,
                color-mix(in srgb, var(--surface) 80%, var(--accent) 20%),
                color-mix(in srgb, var(--bg-panel) 94%, transparent) 22%,
                var(--bg-panel) 100%
            );
        border-color: color-mix(
            in srgb,
            var(--accent) 20%,
            var(--border) 80%
        );
        box-shadow:
            0 20px 60px color-mix(in srgb, var(--bg) 55%, transparent),
            var(--shadow-lg);
        transform-origin: bottom center;
        overflow: auto;
        touch-action: none;
    }

    @media (min-width: 48rem) {
        .modal-backdrop--sheet {
            padding-left: calc(3.5rem + var(--safe-left, 0px));
            padding-right: calc(3.5rem + var(--safe-right, 0px));
            padding-top: calc(1rem + var(--safe-top, 0px));
            padding-bottom: calc(1rem + var(--safe-bottom, 0px));
        }

        .modal-shell--resetTreeChoices {
            min-width: 22rem;
            width: min(
                40rem,
                calc(100vw - 7rem - var(--safe-left, 0px) - var(--safe-right, 0px))
            );
            max-width: min(
                40rem,
                calc(100vw - 7rem - var(--safe-left, 0px) - var(--safe-right, 0px))
            );
        }
    }

    @media (orientation: landscape) and (max-height: 26rem) {
        .modal-backdrop--sheet {
            padding-top: max(0.5rem, var(--safe-top, 0px));
            padding-right: calc(0.75rem + var(--safe-right, 0px));
            padding-bottom: max(0.5rem, var(--safe-bottom, 0px));
            padding-left: calc(0.75rem + var(--safe-left, 0px));
        }

        .modal-shell--resetTreeChoices {
            width: min(
                44rem,
                calc(
                    100vw - 1.5rem - var(--safe-left, 0px) - var(--safe-right, 0px)
                )
            );
            max-width: min(
                44rem,
                calc(
                    100vw - 1.5rem - var(--safe-left, 0px) - var(--safe-right, 0px)
                )
            );
            max-height: calc(100% - max(0.5rem, var(--safe-top, 0px)));
            border-radius: 24px;
        }
    }
</style>
