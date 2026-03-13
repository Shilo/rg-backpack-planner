<script lang="ts">
    import type { Component } from "svelte";
    import {
        MinusIcon,
        PlusIcon,
        ArrowCounterClockwiseIcon,
    } from "phosphor-svelte";
    import { onMount } from "svelte";
    import Button from "../Button.svelte";
    import { triggerHaptic } from "../hapticsStore";
    import type { IconWeight } from "phosphor-svelte";
    import { t } from "svelte-whisper";
    import { scrollInputVisible } from "../viewportState";
    import { evaluateSimpleMath } from "../mathUtil";

    export let title = "";
    export let titleIcon: Component | null = null;
    export let titleIconClass = "";
    export let titleIconAriaHidden = true;
    export let titleIconWeight: IconWeight | undefined = undefined;
    export let message: string | undefined = undefined;
    export let label = "";
    export let value = 0;
    export let min = 0;
    export let step = 1;
    export let confirmLabel = "";
    export let cancelLabel = "";
    export let footerButton: {
        label: string;
        value: number;
        icon: Component;
    } | null = null;
    export let onConfirm: ((value: number) => void) | null = null;
    export let onCancel: (() => void) | null = null;

    let valueText = `${Math.max(min, Math.floor(value))}`;
    let inputEl: HTMLInputElement | null = null;
    $: resolvedLabel = label || $t("modal.valueLabel");
    $: resolvedConfirmLabel = confirmLabel || $t("modal.saveLabel");
    $: resolvedCancelLabel = cancelLabel || $t("modal.cancelLabel");

    function parseValue() {
        const result = evaluateSimpleMath(valueText);
        if (result !== null) return Math.max(min, result);
        const parsed = Number.parseInt(valueText, 10);
        if (Number.isNaN(parsed)) return Math.max(min, 0);
        return Math.max(min, parsed);
    }

    $: currentValue = (() => {
        const result = evaluateSimpleMath(valueText);
        if (result !== null) return Math.max(min, result);
        const parsed = Number.parseInt(valueText, 10);
        if (Number.isNaN(parsed)) return Math.max(min, 0);
        return Math.max(min, parsed);
    })();
    $: isResetDisabled = currentValue === 0;
    $: isDecreaseDisabled = currentValue <= min;

    function clampValueText() {
        valueText = `${parseValue()}`;
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
        setTimeout(() => scrollInputVisible(inputEl), 300);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            handleConfirm();
        }
    }

    onMount(() => {
        inputEl?.focus();
        inputEl?.select();
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
    <label class="modal-label" for="modal-input">{resolvedLabel}</label>
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
            autocomplete="off"
            bind:value={valueText}
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
            {$t("modal.input.plusHundred")}
        </button>
    </div>
    <div class="modal-actions">
        {#if footerButton}
            <div class="modal-actions__left">
                <Button
                    data-modal-current-value
                    icon={footerButton.icon}
                    iconSize={19}
                    iconWeight="fill"
                    on:click={() => {
                        triggerHaptic();
                        onConfirm?.(footerButton.value);
                    }}
                >
                    {footerButton.label}
                </Button>
            </div>
        {/if}
        <div class="modal-actions__right">
            <Button data-modal-cancel on:click={() => onCancel?.()}>
                {resolvedCancelLabel}
            </Button>
            <Button data-modal-confirm on:click={handleConfirm} positive>
                {resolvedConfirmLabel}
            </Button>
        </div>
    </div>
</div>

<style>
    .modal-content {
        display: grid;
        gap: var(--spacing-lg);
        padding: var(--spacing-md);
    }

    .modal-header {
        display: flex;
        align-items: center;
        min-width: 0;
    }

    .modal-title {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        min-width: 0;
        flex: 1;
    }

    .modal-header h2 {
        margin: 0;
        font-size: var(--font-lg); /* not --font-xl: modal shell max-width is too narrow */
        color: var(--text);
        line-height: var(--leading-none);
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
    }

    :global(.modal-title-icon) {
        width: 18px;
        height: 18px;
        color: var(--text-muted);
    }

    .modal-message {
        margin: 0;
        font-size: var(--font-base);
        color: var(--text-muted);
        line-height: 1.4;
        overflow-wrap: anywhere;
        word-break: break-word;
        hyphens: auto;
    }

    .modal-label {
        font-size: var(--font-base);
        color: var(--text-muted);
        letter-spacing: var(--tracking);
    }

    .modal-input-row {
        display: grid;
        grid-template-columns:
            minmax(0, 44px)
            minmax(0, 44px)
            minmax(5ch, 1fr)
            minmax(0, 44px)
            minmax(0, max-content);
        gap: var(--spacing-md);
        align-items: stretch;
    }

    .modal-input {
        display: block;
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
        min-height: 44px;
        border-radius: var(--radius);
        border: var(--border-width) solid var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-muted);
        font-size: var(--font-lg);
        text-align: center;
    }

    .modal-input:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .stepper {
        width: 100%;
        min-height: 44px;
        padding: var(--spacing-sm);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius);
        border: var(--border-width) solid var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-muted);
        font-size: var(--font-lg);
    }

    .stepper:active {
        transform: scale(0.96);
    }

    .stepper:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
        border-color: var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-disabled);
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
        min-width: 0;
        padding-inline: var(--spacing-md);
        padding-block: var(--spacing-sm);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--spacing-lg);
    }

    .modal-actions__left {
        margin-right: auto;
        display: flex;
    }

    .modal-actions__right {
        display: flex;
        gap: var(--spacing-lg);
    }

    .reset-button {
        min-height: 44px;
        flex: 0 0 auto;
    }
</style>
