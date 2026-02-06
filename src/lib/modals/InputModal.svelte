<script lang="ts">
    import type { Component } from "svelte";
    import {
        MinusIcon,
        PlusIcon,
        ArrowCounterClockwiseIcon,
    } from "phosphor-svelte";
    import { onMount } from "svelte";
    import Button from "../Button.svelte";
    import { triggerHaptic } from "../haptics";
    import type { IconWeight } from "phosphor-svelte";

    export let title = "";
    export let titleIcon: Component | null = null;
    export let titleIconClass = "";
    export let titleIconAriaHidden = true;
    export let titleIconWeight: IconWeight | undefined = undefined;
    export let message: string | undefined = undefined;
    export let label = "Value";
    export let value = 0;
    export let min = 0;
    export let step = 1;
    export let confirmLabel = "Save";
    export let cancelLabel = "Cancel";
    export let onConfirm: ((value: number) => void) | null = null;
    export let onCancel: (() => void) | null = null;

    let valueText = `${Math.max(min, Math.floor(value))}`;
    let inputEl: HTMLInputElement | null = null;
    let modalShellEl: HTMLElement | null = null;

    function parseValue() {
        const parsed = Number.parseInt(valueText, 10);
        if (Number.isNaN(parsed)) return Math.max(min, 0);
        return Math.max(min, parsed);
    }

    $: currentValue = (() => {
        const parsed = Number.parseInt(valueText, 10);
        if (Number.isNaN(parsed)) return Math.max(min, 0);
        return Math.max(min, parsed);
    })();
    $: isResetDisabled = currentValue === 0;
    $: isDecreaseDisabled = currentValue <= min;

    function clampValueText() {
        valueText = `${parseValue()}`;
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        valueText = target.value.replace(/\D+/g, "");
    }

    function stepValue(delta: number) {
        const nextValue = Math.max(min, parseValue() + delta);
        valueText = `${nextValue}`;
    }

    function handleConfirm() {
        const nextValue = parseValue();
        onConfirm?.(nextValue);
    }

    function handleReset() {
        valueText = "0";
    }

    function handleStepperClick(action: () => void) {
        triggerHaptic();
        action();
    }

    function handleFocus() {
        // Give the virtual keyboard a moment to open before scrolling.
        setTimeout(() => {
            inputEl?.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 50);
    }

    function updateKeyboardOffset() {
        if (!modalShellEl) return;
        const viewport = window.visualViewport;
        if (!viewport) {
            modalShellEl.style.removeProperty("--keyboard-offset");
            return;
        }
        const keyboardOffset = Math.max(
            0,
            window.innerHeight - (viewport.height + viewport.offsetTop),
        );
        modalShellEl.style.setProperty(
            "--keyboard-offset",
            `${keyboardOffset}px`,
        );
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleConfirm();
        }
    }

    onMount(() => {
        inputEl?.focus();
        inputEl?.select();
        modalShellEl = inputEl
            ? (inputEl.closest(".modal-shell") as HTMLElement | null)
            : null;
        updateKeyboardOffset();
        const viewport = window.visualViewport;
        const handleViewportChange = () => {
            updateKeyboardOffset();
        };
        viewport?.addEventListener("resize", handleViewportChange);
        viewport?.addEventListener("scroll", handleViewportChange);
        window.addEventListener("orientationchange", handleViewportChange);
        return () => {
            viewport?.removeEventListener("resize", handleViewportChange);
            viewport?.removeEventListener("scroll", handleViewportChange);
            window.removeEventListener(
                "orientationchange",
                handleViewportChange,
            );
            modalShellEl?.style.removeProperty("--keyboard-offset");
        };
    });
</script>

<div class="modal-content">
    <header class="modal-header">
        <div class="modal-title">
            {#if titleIcon}
                <svelte:component
                    this={titleIcon}
                    class={`modal-title-icon ${titleIconClass}`.trim()}
                    aria-hidden={titleIconAriaHidden}
                    weight={titleIconWeight}
                />
            {/if}
            <h2>{title}</h2>
        </div>
    </header>
    {#if message}
        <p class="modal-message">{message}</p>
    {/if}
    <label class="modal-label" for="modal-input">{label}</label>
    <div class="modal-input-row">
        <button
            class="stepper stepper-icon reset-button"
            type="button"
            aria-label="Reset value"
            disabled={isResetDisabled}
            on:click={() => handleStepperClick(handleReset)}
        >
            <ArrowCounterClockwiseIcon
                class="stepper-icon__svg"
                aria-hidden="true"
            />
        </button>
        <button
            class="stepper stepper-icon"
            type="button"
            aria-label="Decrease value"
            disabled={isDecreaseDisabled}
            on:click={() => handleStepperClick(() => stepValue(-step))}
        >
            <MinusIcon class="stepper-icon__svg" aria-hidden="true" />
        </button>
        <input
            id="modal-input"
            class="modal-input"
            bind:this={inputEl}
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="off"
            value={valueText}
            on:input={handleInput}
            on:blur={clampValueText}
            on:focus={handleFocus}
            on:keydown={handleKeydown}
        />
        <button
            class="stepper stepper-icon"
            type="button"
            aria-label="Increase value"
            on:click={() => handleStepperClick(() => stepValue(step))}
        >
            <PlusIcon class="stepper-icon__svg" aria-hidden="true" />
        </button>
        <button
            class="stepper stepper-wide"
            type="button"
            aria-label="Increase value by 100"
            on:click={() => handleStepperClick(() => stepValue(100))}
        >
            +100
        </button>
    </div>
    <div class="modal-actions">
        <div class="modal-actions__right">
            <Button data-modal-cancel on:click={() => onCancel?.()}>
                {cancelLabel}
            </Button>
            <Button data-modal-confirm on:click={handleConfirm} positive>
                {confirmLabel}
            </Button>
        </div>
    </div>
</div>

<style>
    .modal-content {
        display: grid;
        gap: 12px;
        padding: 10px;
    }

    :global(.modal-shell) {
        transform: translateY(calc(-1 * var(--keyboard-offset, 0px) * 0.45));
        transition: transform 150ms ease;
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
        font-size: var(--font-size-heading);
        color: var(--color-modal-title);
        line-height: var(--line-height-none);
    }

    :global(.modal-title-icon) {
        width: 18px;
        height: 18px;
        color: var(--color-modal-label);
    }

    .modal-message {
        margin: 0;
        font-size: var(--font-size-modal-body);
        color: var(--color-modal-text);
        line-height: 1.4;
        overflow-wrap: anywhere;
        word-break: break-word;
        hyphens: auto;
    }

    .modal-label {
        font-size: var(--font-size-body);
        color: var(--color-modal-label);
        letter-spacing: var(--letter-spacing-tight);
        text-transform: uppercase;
    }

    .modal-input-row {
        display: grid;
        grid-template-columns:
            minmax(0, 44px)
            minmax(0, 44px)
            minmax(20px, 1fr)
            minmax(0, 44px)
            minmax(0, 60px);
        gap: 6px;
        align-items: center;
    }

    .modal-input {
        min-width: 0;
        width: 100%;
        height: 44px;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-modal-input-alt-border);
        background: var(--color-modal-input-alt-bg2);
        color: var(--color-tooltip-text);
        font-size: var(--font-size-input-number);
        text-align: center;
    }

    .modal-input:focus-visible {
        outline: 2px solid var(--color-button-focus-outline);
        outline-offset: 2px;
    }

    .stepper {
        width: 100%;
        height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-modal-input-alt-border);
        background: var(--color-modal-input-alt-bg);
        color: var(--color-side-menu-heading);
        font-size: var(--font-size-input-number);
    }

    .stepper:active {
        transform: scale(0.96);
    }

    .stepper:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
        border-color: var(--color-button-disabled-border);
        background: var(--color-button-disabled-bg);
        color: var(--color-button-disabled-text);
    }

    .stepper:disabled:active {
        transform: none;
    }

    :global(.stepper-icon__svg) {
        width: 18px;
        height: 18px;
    }

    .stepper-wide {
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 10px;
    }

    .modal-actions__right {
        display: flex;
        gap: 10px;
    }

    .reset-button {
        height: 44px;
        flex: 0 0 auto;
    }
</style>
