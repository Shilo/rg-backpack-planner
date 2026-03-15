<script lang="ts">
    import type { Component } from "svelte";

    export let stepNumber = 1;
    export let stepCount = 1;
    export let hintText = "";
    export let hintIcon: Component | null = null;
    export let compact = false;

    $: progressTicks = Array.from({ length: stepCount }, (_, index) => index);
</script>

<div class="footer-note" class:compact aria-live="polite">
    <div class="footer-top-row">
        <div class="footer-hint">
            {#if hintIcon}
                <span class="hint-icon" aria-hidden="true">
                    <svelte:component this={hintIcon} size={compact ? 16 : 18} />
                </span>
            {/if}
            <span class="hint-text">{hintText}</span>
        </div>
        <span class="step-count">{stepNumber} / {stepCount}</span>
    </div>
    <div class="footer-progress-row">
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
</div>

<style>
    .footer-note {
        min-height: var(--tab-height);
        max-width: min(460px, calc(100vw - 24px));
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-lg);
        background:
            linear-gradient(
                135deg,
                color-mix(in srgb, var(--accent) 12%, var(--bg-raised)),
                color-mix(in srgb, var(--bg-raised) 88%, var(--surface))
            );
        border: var(--border-width) solid color-mix(in srgb, var(--accent) 18%, var(--border));
        border-radius: calc(var(--radius) + 4px);
        box-shadow: var(--shadow), 0 8px 24px color-mix(in srgb, var(--shadow-color, black) 12%, transparent);
        backdrop-filter: blur(var(--blur-md));
        -webkit-backdrop-filter: blur(var(--blur-md));
        color: var(--text-muted);
        pointer-events: none;
    }

    .footer-note.compact {
        min-height: 0;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) var(--spacing-md);
    }

    .footer-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        min-width: 0;
    }

    .footer-progress-row {
        width: 100%;
    }

    .step-count {
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking);
        color: var(--text-muted);
        text-align: right;
        flex-shrink: 0;
    }

    .progress-track {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
    }

    .progress-tick {
        flex: 1;
        height: 6px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--text) 10%, transparent);
        transition:
            transform 180ms var(--ease),
            background 180ms var(--ease),
            opacity 180ms var(--ease);
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

    .footer-hint {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
        min-width: 0;
    }

    .hint-icon {
        display: inline-flex;
        align-items: center;
        opacity: var(--opacity-disabled);
    }

    .hint-text {
        font-size: var(--font-sm);
        line-height: var(--leading);
        letter-spacing: var(--tracking);
        color: var(--text);
        text-wrap: balance;
    }

    .footer-note.compact .hint-text {
        font-size: var(--font-xs);
    }

    .footer-note.compact .step-count {
        font-size: var(--font-xs);
    }
</style>
