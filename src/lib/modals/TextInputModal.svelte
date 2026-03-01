<script lang="ts">
    import type { Component } from "svelte";
    import type { IconWeight } from "phosphor-svelte";
    import { onMount } from "svelte";
    import Button from "../Button.svelte";
    import { t } from "svelte-whisper";

    export let title = "";
    export let titleIcon: Component | null = null;
    export let titleIconClass = "";
    export let titleIconAriaHidden = true;
    export let titleIconWeight: IconWeight | undefined = undefined;
    export let message: string | undefined = undefined;
    export let label = "";
    export let value = "";
    export let maxLength = 25;
    export let placeholder = "";
    export let confirmLabel = "";
    export let cancelLabel = "";
    export let onConfirm: ((value: string) => void) | null = null;
    export let onCancel: (() => void) | null = null;

    let inputValue = value;
    let inputEl: HTMLInputElement | null = null;
    $: resolvedLabel = label || $t("modal.valueLabel");
    $: resolvedConfirmLabel = confirmLabel || $t("modal.saveLabel");
    $: resolvedCancelLabel = cancelLabel || $t("modal.cancelLabel");

    $: isConfirmDisabled = inputValue.trim() === "";

    function handleConfirm() {
        const trimmed = inputValue.trim();
        if (trimmed) {
            onConfirm?.(trimmed);
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && !isConfirmDisabled) {
            event.preventDefault();
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
    <label class="modal-label" for="modal-text-input">{resolvedLabel}</label>
    <input
        id="modal-text-input"
        class="modal-input"
        bind:this={inputEl}
        type="text"
        bind:value={inputValue}
        maxlength={maxLength}
        {placeholder}
        autocomplete="off"
        on:keydown={handleKeydown}
    />
    <div class="modal-actions">
        <Button data-modal-cancel on:click={() => onCancel?.()}>
            {resolvedCancelLabel}
        </Button>
        <Button
            data-modal-confirm
            on:click={handleConfirm}
            disabled={isConfirmDisabled}
            positive
        >
            {resolvedConfirmLabel}
        </Button>
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
    }

    .modal-title {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .modal-header h2 {
        margin: 0;
        font-size: var(--font-lg);
        color: var(--text);
        line-height: var(--leading-none);
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
        margin: 0;
        font-size: var(--font-base);
        font-weight: 500;
        color: var(--text-muted);
    }

    .modal-input {
        width: 100%;
        padding: var(--spacing-md) var(--spacing-lg);
        background: var(--bg-input);
        border: var(--border-width) solid var(--border-subtle);
        border-radius: var(--radius);
        color: var(--text);
        font-size: var(--font-base);
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s ease;
    }

    .modal-input:focus {
        border-color: var(--border-subtle);
    }

    .modal-input::placeholder {
        color: var(--text-disabled);
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-lg);
    }
</style>
