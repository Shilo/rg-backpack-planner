<script lang="ts">
    import {
        BookOpenIcon,
        CaretLeftIcon,
        CaretLineRightIcon,
        CaretRightIcon,
    } from "phosphor-svelte";
    import { triggerHaptic } from "../hapticsStore";

    export let stepNumber = 1;
    export let stepCount = 1;
    export let compact = false;
    export let title = "Tutorial";
    export let hintText = "";
    export let onSkip: (() => void) | null = null;
    export let onBack: (() => void) | null = null;
    export let onForward: (() => void) | null = null;

    $: progressTicks = Array.from({ length: stepCount }, (_, index) => index);
    $: isFirstStep = stepNumber <= 1;
    $: navIconSize = compact ? 18 : 22;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="footer-note"
    class:compact
    role="presentation"
    aria-live="polite"
    on:click|stopPropagation
    on:keydown|stopPropagation
    on:keyup|stopPropagation
    on:pointerdown|stopPropagation
    on:pointerup|stopPropagation
    on:mousedown|stopPropagation
    on:touchstart|stopPropagation
>
    <div class="footer-main">
        <button
            class="nav-button"
            type="button"
            aria-label="Previous step"
            disabled={isFirstStep}
            on:click|stopPropagation={() => { triggerHaptic(); onBack?.(); }}
        >
            <CaretLeftIcon size={navIconSize} weight="bold" />
        </button>

        <button
            class="nav-button"
            type="button"
            aria-label="Next step"
            on:click|stopPropagation={() => { triggerHaptic(); onForward?.(); }}
        >
            <CaretRightIcon size={navIconSize} weight="bold" />
        </button>

        <div class="footer-content">
            <div class="footer-title-row">
                <span class="title-icon" aria-hidden="true">
                    <BookOpenIcon size={compact ? 14 : 16} />
                </span>
                <span class="title-text">{title}</span>
                <span class="step-count">{stepNumber} / {stepCount}</span>
            </div>
            {#if hintText}
                <span class="hint-text">{hintText}</span>
            {/if}
        </div>

        {#if onSkip}
            <button
                class="nav-button nav-skip"
                type="button"
                aria-label="Skip tutorial"
                on:click|stopPropagation={() => { triggerHaptic(); onSkip?.(); }}
            >
                <CaretLineRightIcon size={navIconSize} weight="bold" />
            </button>
        {/if}
    </div>

    <div class="progress-track" aria-hidden="true">
        {#each progressTicks as tick}
            <span
                class="progress-tick"
                class:is-complete={tick + 1 < stepNumber}
                class:is-active={tick + 1 === stepNumber}
            ></span>
        {/each}
    </div>
</div>

<style>
    .footer-note {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px 10px;
        max-width: 100%;
        background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--accent) 12%, var(--bg-raised)),
            color-mix(in srgb, var(--bg-raised) 88%, var(--surface))
        );
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 18%, var(--border));
        border-radius: calc(var(--radius) + 4px);
        box-shadow:
            var(--shadow),
            0 8px 24px
                color-mix(in srgb, var(--shadow-color, black) 12%, transparent);
        backdrop-filter: blur(var(--blur-md));
        -webkit-backdrop-filter: blur(var(--blur-md));
        color: var(--text-muted);
        pointer-events: auto;
    }

    .footer-note.compact {
        gap: var(--spacing-sm);
        padding: 6px var(--spacing-md);
    }

    .footer-main {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--spacing-md);
    }

    .footer-note.compact .footer-main {
        gap: var(--spacing-md);
    }

    .footer-content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: var(--spacing-sm);
        flex: 1;
        min-width: 0;
    }

    .footer-title-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .title-icon {
        display: inline-flex;
        align-items: center;
        color: var(--accent);
        flex-shrink: 0;
    }

    .title-text {
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        color: var(--text);
        line-height: 1.1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .footer-note.compact .title-text {
        font-size: var(--font-xs);
    }

    .step-count {
        font-size: var(--font-xs);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking);
        color: var(--text-muted);
        margin-left: auto;
        flex-shrink: 0;
    }

    .hint-text {
        font-size: var(--font-xs);
        color: var(--text-muted);
        letter-spacing: var(--tracking);
        opacity: 0.7;
    }

    .nav-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 34px;
        aspect-ratio: 1;
        border: var(--border-width) solid
            color-mix(in srgb, var(--text-muted) 28%, transparent);
        border-radius: var(--radius-full);
        background: transparent;
        color: var(--text);
        cursor: pointer;
        flex-shrink: 0;
        transition:
            background 120ms ease,
            border-color 120ms ease,
            color 120ms ease,
            opacity 120ms ease;
    }

    .footer-note.compact .nav-button {
        min-width: 28px;
    }

    .nav-button:hover:not(:disabled) {
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        border-color: color-mix(in srgb, var(--accent) 40%, transparent);
        color: var(--accent);
    }

    .nav-button:active:not(:disabled) {
        background: color-mix(in srgb, var(--accent) 22%, transparent);
    }

    .nav-button:disabled {
        opacity: 0.25;
        cursor: default;
    }

    .nav-skip {
        border-color: var(--danger-border);
        background: var(--danger-bg);
        color: var(--danger-text);
    }

    .nav-skip:hover:not(:disabled) {
        background: var(--danger-bg);
        border-color: var(--danger-border);
        color: var(--danger-text);
        filter: var(--brightness-hover);
    }

    .nav-skip:active:not(:disabled) {
        background: var(--danger-bg);
        border-color: var(--danger-border);
        color: var(--danger-text);
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    .progress-track {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        width: 100%;
    }

    .progress-tick {
        flex: 1;
        height: 4px;
        border-radius: var(--radius-full);
        background: color-mix(in srgb, var(--text) 10%, transparent);
        transition:
            transform 180ms ease,
            background 180ms ease,
            opacity 180ms ease;
        opacity: 0.85;
    }

    .progress-tick.is-complete {
        background: color-mix(in srgb, var(--accent) 52%, var(--surface));
    }

    .progress-tick.is-active {
        background: var(--accent);
        transform: scaleY(1.1);
        opacity: 1;
    }
</style>
