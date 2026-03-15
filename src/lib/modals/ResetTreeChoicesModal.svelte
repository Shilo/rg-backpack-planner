<script lang="ts">
    import type { Component } from "svelte";
    import type { IconWeight } from "phosphor-svelte";
    import {
        ArrowCounterClockwiseIcon,
        ArrowsCounterClockwiseIcon,
    } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { triggerHaptic } from "../hapticsStore";
    import { t } from "svelte-whisper";
    import type { ResetTreeChoiceConfig } from "../modalStore";
    import type { ResetTreeChoiceId } from "../resetTreeChoiceModel";

    export let title = "";
    export let titleIcon: Component | null = null;
    export let titleIconClass = "";
    export let titleIconAriaHidden = true;
    export let titleIconWeight: IconWeight | undefined = undefined;
    export let message: string | undefined = undefined;
    export let choices: ResetTreeChoiceConfig[] = [];
    export let cancelLabel = "";
    export let onConfirm: ((value: ResetTreeChoiceId) => void) | null = null;
    export let onCancel: (() => void) | null = null;

    $: resolvedCancelLabel = cancelLabel || $t("modal.cancelLabel");

    function handleChoice(choice: ResetTreeChoiceConfig) {
        if (choice.disabled) return;
        triggerHaptic();
        onConfirm?.(choice.id);
    }

    function getChoiceIcon(choice: ResetTreeChoiceConfig) {
        return choice.id === "tree"
            ? ArrowsCounterClockwiseIcon
            : ArrowCounterClockwiseIcon;
    }
</script>

<div class="reset-tree-sheet">
    <div class="reset-tree-sheet__grabber" aria-hidden="true"></div>

    <header class="reset-tree-sheet__header">
        <div class="reset-tree-sheet__title">
            {#if titleIcon}
                <svelte:component
                    this={titleIcon}
                    class={`reset-tree-sheet__title-icon ${titleIconClass}`.trim()}
                    aria-hidden={titleIconAriaHidden}
                    weight={titleIconWeight}
                />
            {/if}
            <h2>{title}</h2>
        </div>
        {#if message}
            <p class="reset-tree-sheet__message">{message}</p>
        {/if}
    </header>

    <div class="reset-tree-sheet__choices">
        {#each choices as choice (choice.id)}
            <button
                type="button"
                class={`reset-tree-choice reset-tree-choice--${choice.tone}`}
                data-modal-choice
                disabled={choice.disabled}
                on:click={() => handleChoice(choice)}
            >
                <span class="reset-tree-choice__rail" aria-hidden="true"></span>
                <span class="reset-tree-choice__copy">
                    <span class="reset-tree-choice__label">{choice.label}</span>
                    <span class="reset-tree-choice__description">
                        {choice.description}
                    </span>
                </span>
                <svelte:component
                    this={getChoiceIcon(choice)}
                    class="reset-tree-choice__icon"
                    size={18}
                    aria-hidden={true}
                />
            </button>
        {/each}
    </div>

    <Button
        class="reset-tree-sheet__cancel"
        data-modal-cancel
        on:click={() => onCancel?.()}
    >
        {resolvedCancelLabel}
    </Button>
</div>

<style>
    .reset-tree-sheet {
        display: grid;
        gap: var(--spacing-lg);
        width: 100%;
        min-width: 0;
        padding: var(--spacing-md);
    }

    .reset-tree-sheet__grabber {
        width: 42px;
        height: 4px;
        border-radius: var(--radius-full);
        margin: 0 auto;
        background: color-mix(in srgb, var(--text-muted) 28%, transparent);
    }

    .reset-tree-sheet__header {
        display: grid;
        gap: var(--spacing-md);
    }

    .reset-tree-sheet__title {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-md);
        min-width: 0;
    }

    .reset-tree-sheet__title h2 {
        margin: 0;
        font-size: var(--font-lg);
        color: var(--text);
        line-height: 1.1;
    }

    .reset-tree-sheet__title-icon {
        width: 18px;
        height: 18px;
        color: var(--text-muted);
    }

    .reset-tree-sheet__message {
        margin: 0;
        color: var(--text-muted);
        font-size: var(--font-base);
        line-height: var(--leading);
    }

    .reset-tree-sheet__choices {
        display: grid;
        gap: var(--spacing-md);
    }

    .reset-tree-choice {
        --choice-accent: var(--accent);
        --choice-bg: color-mix(in srgb, var(--bg-raised) 82%, var(--choice-accent) 18%);
        --choice-border: color-mix(in srgb, var(--border) 55%, var(--choice-accent) 45%);
        --choice-copy: color-mix(in srgb, var(--text-muted) 60%, var(--choice-accent) 40%);
        width: 100%;
        min-height: 68px;
        border: var(--border-width) solid var(--choice-border);
        border-radius: calc(var(--radius) + 4px);
        background: var(--choice-bg);
        color: var(--text);
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: var(--spacing-lg);
        padding: 0.75rem 0.875rem;
        text-align: left;
        transition:
            transform var(--ease),
            filter var(--ease),
            border-color var(--ease),
            background var(--ease);
    }

    .reset-tree-choice:not(:disabled) {
        cursor: pointer;
    }

    .reset-tree-choice:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .reset-tree-choice:not(:disabled):hover {
            filter: var(--brightness-hover);
        }
    }

    .reset-tree-choice:not(:disabled):active {
        transform: scale(0.985);
        filter: var(--brightness-hover);
    }

    .reset-tree-choice:disabled {
        background: var(--bg-input);
        border-color: var(--border-subtle);
        color: var(--text-disabled);
        cursor: not-allowed;
    }

    .reset-tree-choice__rail {
        width: 6px;
        align-self: stretch;
        border-radius: var(--radius-full);
        background: var(--choice-accent);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--choice-accent) 35%, transparent);
    }

    .reset-tree-choice__copy {
        display: grid;
        gap: var(--spacing-xs);
        min-width: 0;
    }

    .reset-tree-choice__label {
        font-size: var(--font-base);
        font-weight: var(--weight-semibold);
        line-height: 1.15;
        color: inherit;
    }

    .reset-tree-choice__description {
        font-size: var(--font-sm);
        color: var(--choice-copy);
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    :global(.reset-tree-choice__icon) {
        color: var(--choice-accent);
        opacity: 0.9;
        flex: 0 0 auto;
    }

    .reset-tree-choice:disabled .reset-tree-choice__rail {
        background: var(--text-disabled);
        box-shadow: none;
        opacity: 0.45;
    }

    .reset-tree-choice:disabled :global(.reset-tree-choice__icon) {
        color: var(--text-disabled);
        opacity: 0.45;
    }

    .reset-tree-choice:disabled .reset-tree-choice__description {
        color: var(--text-disabled);
    }

    .reset-tree-choice--orange {
        --choice-accent: var(--region-orange-accent);
    }

    .reset-tree-choice--blue {
        --choice-accent: var(--region-blue-accent);
    }

    .reset-tree-choice--yellow {
        --choice-accent: var(--region-yellow-accent);
    }

    .reset-tree-choice--danger {
        --choice-accent: var(--accent-danger);
        --choice-bg: color-mix(in srgb, var(--danger-bg) 78%, var(--bg-raised) 22%);
        --choice-border: color-mix(in srgb, var(--danger-border) 75%, var(--border) 25%);
        --choice-copy: color-mix(in srgb, var(--danger-text) 78%, var(--text-muted) 22%);
    }

    :global(.reset-tree-sheet__cancel) {
        width: 100%;
        justify-content: center;
        border-radius: calc(var(--radius) + 4px);
        min-height: 44px;
        font-weight: var(--weight-semibold);
    }

    @media (min-width: 768px) {
        .reset-tree-sheet {
            min-width: 22rem;
        }
    }
</style>
