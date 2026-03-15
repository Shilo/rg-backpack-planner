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
    export let sheetIcon: Component | null = null;
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
    <div class="reset-tree-sheet__handle-zone" aria-hidden="true">
        <div class="reset-tree-sheet__grabber"></div>
    </div>

    <header class="reset-tree-sheet__header">
        <div class="reset-tree-sheet__header-top">
            {#if sheetIcon}
                <span class="reset-tree-sheet__tree-badge" aria-hidden="true">
                    <svelte:component
                        this={sheetIcon}
                        class="reset-tree-sheet__tree-icon"
                    />
                </span>
            {/if}
            {#if titleIcon}
                <span class="reset-tree-sheet__title-chip">
                    <svelte:component
                        this={titleIcon}
                        class={`reset-tree-sheet__title-icon ${titleIconClass}`.trim()}
                        aria-hidden={titleIconAriaHidden}
                        weight={titleIconWeight}
                    />
                </span>
            {/if}
        </div>
        <div class="reset-tree-sheet__title">
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
                <span class="reset-tree-choice__leading" aria-hidden="true">
                    <span class="reset-tree-choice__leading-icon-wrap">
                        <svelte:component
                            this={getChoiceIcon(choice)}
                            class="reset-tree-choice__icon"
                            size={18}
                            aria-hidden={true}
                        />
                    </span>
                </span>
                <span class="reset-tree-choice__copy">
                    <span class="reset-tree-choice__label">{choice.label}</span>
                    <span class="reset-tree-choice__description">
                        {choice.description}
                    </span>
                </span>
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
        --sheet-inline-padding: clamp(1rem, 4vw, 1.5rem);
        container-type: inline-size;
        display: grid;
        gap: clamp(0.75rem, 2vw, 1rem);
        width: 100%;
        min-width: 0;
        padding:
            0
            var(--sheet-inline-padding)
            calc(1rem + min(var(--safe-bottom, 0px), 1rem))
            var(--sheet-inline-padding);
    }

    .reset-tree-sheet__handle-zone {
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: calc(var(--spacing-xs) * -1);
    }

    .reset-tree-sheet__grabber {
        width: 42px;
        height: 4px;
        border-radius: var(--radius-full);
        background: color-mix(in srgb, var(--text-muted) 32%, transparent);
        box-shadow: 0 1px 0 color-mix(in srgb, var(--text) 10%, transparent);
    }

    .reset-tree-sheet__header {
        display: grid;
        gap: 0.75rem;
        padding-bottom: 0.25rem;
    }

    .reset-tree-sheet__header-top {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .reset-tree-sheet__tree-badge,
    .reset-tree-sheet__title-chip {
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 22%, var(--border) 78%);
        background:
            linear-gradient(
                180deg,
                color-mix(in srgb, var(--surface) 78%, var(--accent) 22%),
                color-mix(in srgb, var(--bg-raised) 88%, transparent)
            );
        box-shadow: var(--shadow-sm);
    }

    .reset-tree-sheet__tree-badge {
        width: 3rem;
        height: 3rem;
        border-radius: 1rem;
        color: var(--accent-light);
    }

    .reset-tree-sheet__title-chip {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.875rem;
        color: var(--text-muted);
    }

    .reset-tree-sheet__tree-icon {
        width: 1.375rem;
        height: 1.375rem;
    }

    .reset-tree-sheet__title {
        display: grid;
        min-width: 0;
    }

    .reset-tree-sheet__title h2 {
        margin: 0;
        font-size: clamp(1.1rem, 2vw, 1.35rem);
        color: var(--text);
        line-height: 1.14;
        letter-spacing: 0.01em;
        text-wrap: balance;
    }

    .reset-tree-sheet__title-icon {
        width: 18px;
        height: 18px;
    }

    .reset-tree-sheet__message {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.95rem;
        line-height: var(--leading);
        max-width: 40ch;
        text-wrap: pretty;
    }

    .reset-tree-sheet__choices {
        display: grid;
        gap: 0.75rem;
    }

    .reset-tree-choice {
        --choice-accent: var(--accent);
        --choice-bg: color-mix(
            in srgb,
            var(--bg-raised) 84%,
            var(--choice-accent) 16%
        );
        --choice-border: color-mix(
            in srgb,
            var(--border-subtle) 72%,
            var(--choice-accent) 28%
        );
        --choice-copy: color-mix(
            in srgb,
            var(--text-muted) 68%,
            var(--choice-accent) 32%
        );
        width: 100%;
        min-height: 76px;
        border: var(--border-width) solid var(--choice-border);
        border-radius: 1.25rem;
        background: var(--choice-bg);
        color: var(--text);
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: start;
        gap: 0.875rem;
        padding: 0.95rem 1rem;
        text-align: left;
        box-shadow:
            inset 0 1px 0 color-mix(in srgb, var(--text) 6%, transparent),
            0 10px 24px color-mix(in srgb, var(--bg) 14%, transparent);
        transition:
            transform var(--ease),
            filter var(--ease),
            border-color var(--ease),
            background var(--ease),
            box-shadow var(--ease);
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
        transform: scale(0.985) translateY(1px);
        filter: var(--brightness-hover);
    }

    .reset-tree-choice:disabled {
        background: var(--bg-input);
        border-color: var(--border-subtle);
        color: var(--text-disabled);
        cursor: not-allowed;
    }

    .reset-tree-choice__leading {
        padding-top: 0.1rem;
    }

    .reset-tree-choice__leading-icon-wrap {
        width: 2.5rem;
        height: 2.5rem;
        display: grid;
        place-items: center;
        border-radius: 0.95rem;
        background: color-mix(
            in srgb,
            var(--choice-accent) 20%,
            var(--bg-panel) 80%
        );
        border: var(--border-width) solid
            color-mix(in srgb, var(--choice-accent) 40%, transparent);
        box-shadow: inset 0 1px 0 color-mix(in srgb, white 10%, transparent);
    }

    .reset-tree-choice__copy {
        display: grid;
        gap: 0.2rem;
        min-width: 0;
    }

    .reset-tree-choice__label {
        font-size: 0.96rem;
        font-weight: var(--weight-semibold);
        line-height: 1.2;
        color: inherit;
        text-wrap: balance;
    }

    .reset-tree-choice__description {
        font-size: 0.8rem;
        color: var(--choice-copy);
        line-height: var(--leading);
        overflow-wrap: anywhere;
        text-wrap: pretty;
    }

    :global(.reset-tree-choice__icon) {
        color: var(--choice-accent);
        opacity: 0.92;
    }

    .reset-tree-choice:disabled .reset-tree-choice__leading-icon-wrap {
        background: color-mix(in srgb, var(--bg-input) 88%, transparent);
        border-color: color-mix(in srgb, var(--text-disabled) 28%, transparent);
        box-shadow: none;
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
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 1.25rem;
        min-height: 52px;
        font-weight: var(--weight-semibold);
        background: color-mix(in srgb, var(--surface) 82%, var(--accent) 18%);
        border-color: color-mix(in srgb, var(--accent) 26%, var(--border) 74%);
        color: var(--text);
        text-align: center;
    }

    .reset-tree-sheet__header,
    .reset-tree-choice,
    :global(.reset-tree-sheet__cancel) {
        opacity: 0;
        animation: reset-tree-sheet-item-in 280ms var(--ease-emphasis) both;
    }

    .reset-tree-sheet__header {
        animation-delay: 30ms;
    }

    .reset-tree-choice:nth-child(1) {
        animation-delay: 70ms;
    }

    .reset-tree-choice:nth-child(2) {
        animation-delay: 110ms;
    }

    .reset-tree-choice:nth-child(3) {
        animation-delay: 150ms;
    }

    .reset-tree-choice:nth-child(4) {
        animation-delay: 190ms;
    }

    :global(.reset-tree-sheet__cancel) {
        animation-delay: 230ms;
    }

    @keyframes reset-tree-sheet-item-in {
        from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
        }

        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @container (min-width: 32rem) {
        .reset-tree-sheet__choices {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (orientation: landscape) and (max-height: 46rem) {
        .reset-tree-sheet {
            gap: 0.75rem;
            padding-bottom: calc(0.875rem + min(var(--safe-bottom, 0px), 0.75rem));
        }

        .reset-tree-sheet__header {
            grid-template-columns: auto 1fr;
            column-gap: 1rem;
            align-items: start;
        }

        .reset-tree-sheet__header-top {
            grid-row: 1 / span 2;
            align-self: start;
        }

        .reset-tree-sheet__choices {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .reset-tree-sheet__header,
        .reset-tree-choice,
        :global(.reset-tree-sheet__cancel) {
            opacity: 1;
            animation: none;
            transform: none;
            transition:
                border-color var(--ease),
                background var(--ease),
                filter var(--ease);
        }
    }

    @media (min-width: 48rem) {
        .reset-tree-sheet {
            min-width: 24rem;
        }
    }
</style>
