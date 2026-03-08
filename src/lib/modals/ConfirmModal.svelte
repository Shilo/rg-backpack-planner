<script lang="ts">
    import type { Component } from "svelte";
    import type { IconWeight } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { t } from "svelte-whisper";

    export let title = "";
    export let titleIcon: Component | null = null;
    export let titleIconClass = "";
    export let titleIconAriaHidden = true;
    export let titleIconWeight: IconWeight | undefined = undefined;
    export let message: string | undefined = undefined;
    export let confirmLabel = "";
    export let cancelLabel = "";
    export let confirmNegative = false;
    export let confirmPositive = false;
    export let onConfirm: (() => void) | null = null;
    export let onCancel: (() => void) | null = null;
    $: resolvedConfirmLabel = confirmLabel || $t("modal.confirmLabel");
    $: resolvedCancelLabel = cancelLabel || $t("modal.cancelLabel");
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
    <div class="modal-actions">
        <Button data-modal-cancel on:click={() => onCancel?.()}>
            {resolvedCancelLabel}
        </Button>
        <Button
            data-modal-confirm
            on:click={() => onConfirm?.()}
            negative={confirmNegative}
            positive={confirmPositive}
        >
            {resolvedConfirmLabel}
        </Button>
    </div>
</div>

<style>
    .modal-content {
        display: grid;
        gap: var(--spacing-md);
        padding: var(--spacing-sm);
        width: 100%;
        min-width: 0;
    }

    .modal-header {
        display: flex;
        align-items: center;
        min-width: 0;
    }

    .modal-title {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
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
        line-height: 1.35;
        overflow-wrap: anywhere;
        word-break: break-word;
        hyphens: auto;
        min-width: 0;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-md);
        min-width: 0;
    }
</style>
