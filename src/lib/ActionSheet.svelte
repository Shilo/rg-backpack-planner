<script lang="ts">
    import type { Component } from "svelte";
    import {
        ArrowCounterClockwiseIcon,
        ArrowsCounterClockwiseIcon,
    } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import { triggerHaptic } from "./hapticsStore";
    import type { ActionSheetChoice } from "./actionSheetTypes";

    export let title = "";
    export let sheetIcon: Component | null = null;
    export let message: string | undefined = undefined;
    export let choices: ActionSheetChoice[] = [];
    export let cancelLabel = "";
    export let onConfirm: ((value: string | number) => void) | null = null;
    export let onCancel: (() => void) | null = null;
    /** Optional: return icon per choice. Defaults to ArrowsCounterClockwise for id "tree", else ArrowCounterClockwise. */
    export let getChoiceIcon: ((choice: ActionSheetChoice) => Component) | null =
        null;

    $: resolvedCancelLabel = cancelLabel;
    $: defaultGetChoiceIcon = (choice: ActionSheetChoice) =>
        choice.id === "tree"
            ? ArrowsCounterClockwiseIcon
            : ArrowCounterClockwiseIcon;
    $: resolvedGetChoiceIcon = getChoiceIcon ?? defaultGetChoiceIcon;

    function handleChoice(choice: ActionSheetChoice) {
        if (choice.disabled) return;
        triggerHaptic();
        onConfirm?.(choice.id);
    }
</script>

<div class="action-sheet">
    <header class="action-sheet__header">
        {#if sheetIcon}
            <span class="action-sheet__icon-badge" aria-hidden="true">
                <svelte:component
                    this={sheetIcon}
                    class="action-sheet__header-icon"
                    size={42}
                />
            </span>
        {/if}
        <div class="action-sheet__header-copy">
            <h2>{title}</h2>
            {#if message}
                <p class="action-sheet__message">{message}</p>
            {/if}
        </div>
    </header>

    <div class="action-sheet__choices">
        {#each choices as choice (choice.id)}
            <button
                type="button"
                class={`action-sheet__choice action-sheet__choice--${choice.tone}`}
                data-modal-choice
                disabled={choice.disabled}
                on:click={() => handleChoice(choice)}
            >
                <span class="action-sheet__choice-leading" aria-hidden="true">
                    <span class="action-sheet__choice-icon-wrap">
                        <svelte:component
                            this={resolvedGetChoiceIcon(choice)}
                            class="action-sheet__choice-icon"
                            size={18}
                            aria-hidden={true}
                        />
                    </span>
                </span>
                <span class="action-sheet__choice-copy">
                    <span class="action-sheet__choice-label">{choice.label}</span>
                    <span class="action-sheet__choice-description">
                        {#if choice.descriptionAmount}
                            {choice.descriptionPrefix ?? ""}
                            <span class="action-sheet__choice-amount">
                                {choice.descriptionAmount}
                            </span>
                            {choice.descriptionSuffix ?? ""}
                        {:else}
                            {choice.description}
                        {/if}
                    </span>
                </span>
            </button>
        {/each}
    </div>

    <Button
        class="action-sheet__cancel"
        data-modal-cancel
        on:click={() => onCancel?.()}
    >
        {resolvedCancelLabel}
    </Button>
</div>

<style>
    .action-sheet {
        --sheet-inline-padding: clamp(0.75rem, 3vw, 1rem);
        container-type: inline-size;
        display: grid;
        gap: clamp(0.5rem, 1.6vw, 0.75rem);
        width: 100%;
        min-width: 0;
        padding: clamp(0.65rem, 1.8vw, 0.85rem) var(--sheet-inline-padding)
            calc(0.75rem + min(var(--safe-bottom, 0px), 0.75rem))
            var(--sheet-inline-padding);
    }

    .action-sheet__header {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 0.625rem;
    }

    .action-sheet__icon-badge {
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 22%, var(--border) 78%);
        background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--surface) 78%, var(--accent) 22%),
            color-mix(in srgb, var(--bg-raised) 88%, transparent)
        );
        box-shadow: var(--shadow-sm);
        width: 3rem;
        height: 3rem;
        border-radius: 0.95rem;
        color: var(--accent-light);
    }

    .action-sheet__header-icon {
        width: 2.625rem;
        height: 2.625rem;
    }

    .action-sheet__header-copy {
        display: grid;
        gap: 0.2rem;
        min-width: 0;
    }

    .action-sheet__header-copy h2 {
        margin: 0;
        font-size: clamp(1rem, 1.7vw, 1.18rem);
        color: var(--text);
        line-height: 1.12;
        letter-spacing: 0.01em;
        text-wrap: balance;
    }

    .action-sheet__message {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.82rem;
        line-height: 1.28;
        text-wrap: pretty;
    }

    .action-sheet__choices {
        display: grid;
        gap: 0.5rem;
    }

    .action-sheet__choice {
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
        min-height: 66px;
        border: var(--border-width) solid var(--choice-border);
        border-radius: 1.1rem;
        background: var(--choice-bg);
        color: var(--text);
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: start;
        gap: 0.65rem;
        padding: 0.72rem 0.8rem;
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

    .action-sheet__choice:not(:disabled) {
        cursor: pointer;
    }

    .action-sheet__choice:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .action-sheet__choice:not(:disabled):hover {
            filter: var(--brightness-hover);
        }
    }

    .action-sheet__choice:not(:disabled):active {
        transform: scale(0.985) translateY(1px);
        filter: var(--brightness-hover);
    }

    .action-sheet__choice:disabled {
        background: var(--bg-input);
        border-color: var(--border-subtle);
        color: var(--text-disabled);
        cursor: not-allowed;
    }

    .action-sheet__choice-leading {
        padding-top: 0.06rem;
    }

    .action-sheet__choice-icon-wrap {
        width: 2.125rem;
        height: 2.125rem;
        display: grid;
        place-items: center;
        border-radius: 0.8rem;
        background: color-mix(
            in srgb,
            var(--choice-accent) 20%,
            var(--bg-panel) 80%
        );
        border: var(--border-width) solid
            color-mix(in srgb, var(--choice-accent) 40%, transparent);
        box-shadow: inset 0 1px 0 color-mix(in srgb, white 10%, transparent);
    }

    .action-sheet__choice-copy {
        display: grid;
        gap: 0.14rem;
        min-width: 0;
    }

    .action-sheet__choice-label {
        font-size: 0.9rem;
        font-weight: var(--weight-semibold);
        line-height: 1.14;
        color: inherit;
        text-wrap: balance;
    }

    .action-sheet__choice-description {
        font-size: 0.74rem;
        color: var(--choice-copy);
        line-height: 1.28;
        overflow-wrap: anywhere;
        text-wrap: pretty;
    }

    .action-sheet__choice-amount {
        color: var(--choice-accent);
        font-weight: var(--weight-bold);
        font-variant-numeric: tabular-nums;
    }

    :global(.action-sheet__choice-icon) {
        color: var(--choice-accent);
        opacity: 0.92;
    }

    .action-sheet__choice:disabled .action-sheet__choice-icon-wrap {
        background: color-mix(in srgb, var(--bg-input) 88%, transparent);
        border-color: color-mix(in srgb, var(--text-disabled) 28%, transparent);
        box-shadow: none;
    }

    .action-sheet__choice:disabled :global(.action-sheet__choice-icon) {
        color: var(--text-disabled);
        opacity: 0.45;
    }

    .action-sheet__choice:disabled .action-sheet__choice-description {
        color: var(--text-disabled);
    }

    .action-sheet__choice:disabled .action-sheet__choice-amount {
        color: var(--text-disabled);
    }

    .action-sheet__choice--orange {
        --choice-accent: var(--region-orange-accent);
    }

    .action-sheet__choice--blue {
        --choice-accent: var(--region-blue-accent);
    }

    .action-sheet__choice--yellow {
        --choice-accent: var(--region-yellow-accent);
    }

    .action-sheet__choice--danger {
        --choice-accent: var(--accent-danger);
        --choice-bg: color-mix(
            in srgb,
            var(--danger-bg) 78%,
            var(--bg-raised) 22%
        );
        --choice-border: color-mix(
            in srgb,
            var(--danger-border) 75%,
            var(--border) 25%
        );
        --choice-copy: color-mix(
            in srgb,
            var(--danger-text) 78%,
            var(--text-muted) 22%
        );
    }

    :global(.action-sheet__cancel) {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 1.1rem;
        min-height: 46px;
        font-weight: var(--weight-semibold);
        background: color-mix(in srgb, var(--surface) 82%, var(--accent) 18%);
        border-color: color-mix(in srgb, var(--accent) 26%, var(--border) 74%);
        color: var(--text);
        text-align: center;
        margin-top: 0.125rem;
    }

    .action-sheet__header,
    .action-sheet__choice,
    :global(.action-sheet__cancel) {
        opacity: 0;
        animation: action-sheet-item-in 280ms var(--ease-emphasis) both;
    }

    .action-sheet__header {
        animation-delay: 30ms;
    }

    .action-sheet__choice:nth-child(1) {
        animation-delay: 70ms;
    }

    .action-sheet__choice:nth-child(2) {
        animation-delay: 110ms;
    }

    .action-sheet__choice:nth-child(3) {
        animation-delay: 150ms;
    }

    .action-sheet__choice:nth-child(4) {
        animation-delay: 190ms;
    }

    :global(.action-sheet__cancel) {
        animation-delay: 230ms;
    }

    @keyframes action-sheet-item-in {
        from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
        }

        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @container (min-width: 30rem) {
        .action-sheet__choices {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (orientation: landscape) and (max-height: 46rem) {
        .action-sheet {
            --sheet-inline-padding: 0.8rem;
            gap: 0.5rem;
            padding-top: 0.7rem;
            padding-bottom: calc(0.7rem + min(var(--safe-bottom, 0px), 0.6rem));
        }

        .action-sheet__choices {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (orientation: landscape) and (max-height: 26rem) {
        .action-sheet {
            --sheet-inline-padding: 0.7rem;
            gap: 0.45rem;
            padding-top: 0.55rem;
            padding-bottom: calc(
                0.6rem + min(var(--safe-bottom, 0px), 0.45rem)
            );
        }

        .action-sheet__header-copy h2 {
            font-size: 0.94rem;
        }

        .action-sheet__message {
            font-size: 0.76rem;
        }

        .action-sheet__choice {
            min-height: 58px;
            gap: 0.55rem;
            padding: 0.6rem 0.66rem;
        }

        .action-sheet__choice-icon-wrap {
            width: 1.9rem;
            height: 1.9rem;
            border-radius: 0.72rem;
        }

        .action-sheet__choice-label {
            font-size: 0.84rem;
        }

        .action-sheet__choice-description {
            font-size: 0.68rem;
        }

        :global(.action-sheet__cancel) {
            min-height: 38px;
            margin-top: 0;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .action-sheet__header,
        .action-sheet__choice,
        :global(.action-sheet__cancel) {
            opacity: 1;
            animation: none;
            transform: none;
        }
    }

    @media (min-width: 48rem) {
        .action-sheet {
            min-width: 24rem;
        }
    }
</style>
