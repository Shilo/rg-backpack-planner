<script lang="ts">
    import type { Component } from "svelte";
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
    export let sheetIcon: Component | null = null;
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
    <header class="reset-tree-sheet__header">
        {#if sheetIcon}
            <span class="reset-tree-sheet__tree-badge" aria-hidden="true">
                <svelte:component
                    this={sheetIcon}
                    class="reset-tree-sheet__tree-icon"
                />
            </span>
        {/if}
        <div class="reset-tree-sheet__header-copy">
            <h2>{title}</h2>
            {#if message}
                <p class="reset-tree-sheet__message">{message}</p>
            {/if}
        </div>
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
        --sheet-inline-padding: clamp(0.875rem, 3.2vw, 1.25rem);
        container-type: inline-size;
        display: grid;
        gap: clamp(0.625rem, 1.8vw, 0.875rem);
        width: 100%;
        min-width: 0;
        padding:
            clamp(0.75rem, 2vw, 1rem)
            var(--sheet-inline-padding)
            calc(0.875rem + min(var(--safe-bottom, 0px), 0.875rem))
            var(--sheet-inline-padding);
    }

    .reset-tree-sheet__header {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 0.75rem;
        padding-bottom: 0.125rem;
    }

    .reset-tree-sheet__tree-badge {
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
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 1.1rem;
        color: var(--accent-light);
    }

    .reset-tree-sheet__tree-icon {
        width: 1.85rem;
        height: 1.85rem;
    }

    .reset-tree-sheet__header-copy {
        display: grid;
        gap: 0.3rem;
        min-width: 0;
    }

    .reset-tree-sheet__header-copy h2 {
        margin: 0;
        font-size: clamp(1.02rem, 1.8vw, 1.28rem);
        color: var(--text);
        line-height: 1.12;
        letter-spacing: 0.01em;
        text-wrap: balance;
    }

    .reset-tree-sheet__message {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.88rem;
        line-height: var(--leading);
        text-wrap: pretty;
    }

    .reset-tree-sheet__choices {
        display: grid;
        gap: 0.625rem;
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
        min-height: 70px;
        border: var(--border-width) solid var(--choice-border);
        border-radius: 1.1rem;
        background: var(--choice-bg);
        color: var(--text);
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: start;
        gap: 0.75rem;
        padding: 0.8rem 0.875rem;
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
        width: 2.25rem;
        height: 2.25rem;
        display: grid;
        place-items: center;
        border-radius: 0.85rem;
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
        gap: 0.16rem;
        min-width: 0;
    }

    .reset-tree-choice__label {
        font-size: 0.92rem;
        font-weight: var(--weight-semibold);
        line-height: 1.14;
        color: inherit;
        text-wrap: balance;
    }

    .reset-tree-choice__description {
        font-size: 0.77rem;
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
        border-radius: 1.1rem;
        min-height: 46px;
        font-weight: var(--weight-semibold);
        background: color-mix(in srgb, var(--surface) 82%, var(--accent) 18%);
        border-color: color-mix(in srgb, var(--accent) 26%, var(--border) 74%);
        color: var(--text);
        text-align: center;
        margin-top: 0.125rem;
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

    @container (min-width: 30rem) {
        .reset-tree-sheet__choices {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (orientation: landscape) and (max-height: 46rem) {
        .reset-tree-sheet {
            --sheet-inline-padding: 0.8rem;
            gap: 0.5rem;
            padding-top: 0.7rem;
            padding-bottom: calc(0.7rem + min(var(--safe-bottom, 0px), 0.6rem));
        }

        .reset-tree-sheet__header {
            gap: 0.625rem;
        }

        .reset-tree-sheet__choices {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (orientation: landscape) and (max-height: 26rem) {
        .reset-tree-sheet {
            --sheet-inline-padding: 0.7rem;
            gap: 0.45rem;
            padding-top: 0.55rem;
            padding-bottom: calc(0.6rem + min(var(--safe-bottom, 0px), 0.45rem));
        }

        .reset-tree-sheet__header {
            gap: 0.55rem;
            padding-bottom: 0;
        }

        .reset-tree-sheet__tree-badge {
            width: 3rem;
            height: 3rem;
            border-radius: 0.95rem;
        }

        .reset-tree-sheet__tree-icon {
            width: 1.6rem;
            height: 1.6rem;
        }

        .reset-tree-sheet__header-copy {
            gap: 0.18rem;
        }

        .reset-tree-sheet__header-copy h2 {
            font-size: 0.98rem;
        }

        .reset-tree-sheet__message {
            font-size: 0.8rem;
        }

        .reset-tree-sheet__choices {
            gap: 0.5rem;
        }

        .reset-tree-choice {
            min-height: 62px;
            gap: 0.625rem;
            padding: 0.68rem 0.75rem;
        }

        .reset-tree-choice__leading-icon-wrap {
            width: 2rem;
            height: 2rem;
            border-radius: 0.78rem;
        }

        .reset-tree-choice__label {
            font-size: 0.88rem;
        }

        .reset-tree-choice__description {
            font-size: 0.72rem;
        }

        :global(.reset-tree-sheet__cancel) {
            min-height: 40px;
            margin-top: 0;
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
