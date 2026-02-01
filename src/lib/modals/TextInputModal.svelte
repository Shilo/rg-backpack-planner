<script lang="ts">
    import type { ComponentType } from "svelte";
    import type { IconWeight } from "phosphor-svelte";
    import { onMount } from "svelte";
    import Button from "../Button.svelte";

    export let title = "";
    export let titleIcon: ComponentType | null = null;
    export let titleIconClass = "";
    export let titleIconAriaHidden = true;
    export let titleIconWeight: IconWeight | undefined = undefined;
    export let message: string | undefined = undefined;
    export let label = "Value";
    export let value = "";
    export let maxLength = 25;
    export let placeholder = "";
    export let confirmLabel = "Save";
    export let cancelLabel = "Cancel";
    export let onConfirm: ((value: string) => void) | null = null;
    export let onCancel: (() => void) | null = null;

    let inputValue = value;
    let inputEl: HTMLInputElement | null = null;

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
    <label class="modal-label" for="modal-text-input">{label}</label>
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
            {cancelLabel}
        </Button>
        <Button
            data-modal-confirm
            on:click={handleConfirm}
            disabled={isConfirmDisabled}
            positive
        >
            {confirmLabel}
        </Button>
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

    .modal-label {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 500;
        color: #c8d6f7;
    }

    .modal-input {
        width: 100%;
        padding: 10px 12px;
        background: rgba(16, 25, 43, 0.6);
        border: 1px solid rgba(82, 112, 189, 0.4);
        border-radius: 8px;
        color: #f1f5ff;
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s ease;
    }

    .modal-input:focus {
        border-color: rgba(82, 112, 189, 0.8);
    }

    .modal-input::placeholder {
        color: rgba(185, 199, 236, 0.4);
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
</style>
