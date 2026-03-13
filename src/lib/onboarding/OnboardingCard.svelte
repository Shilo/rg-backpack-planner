<script lang="ts">
    import type { Component } from "svelte";

    export let icon: Component;
    export let label: string | string[];
    export let description: string;
    export let variant: "accent" | "muted" = "accent";
    export let index: number = 0;

    $: labels = Array.isArray(label) ? label : [label];
</script>

<div class="onboarding-card {variant}" style="--card-index: {index}">
    <span class="card-icon" aria-hidden="true">
        <svelte:component this={icon} size={32} />
    </span>
    <span class="card-labels">
        {#each labels as l}
            <span class="card-label">{l}</span>
        {/each}
    </span>
    <span class="card-desc">{description}</span>
</div>

<style>
    .onboarding-card {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto;
        column-gap: var(--spacing-md);
        row-gap: 2px;
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--bg-panel);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        backdrop-filter: blur(var(--blur-md));
        -webkit-backdrop-filter: blur(var(--blur-md));
        opacity: 0;
        animation: card-enter 280ms var(--ease-decel) both;
        animation-delay: calc(150ms + var(--card-index) * 70ms);
        white-space: nowrap;
    }

    .onboarding-card.accent {
        border-color: color-mix(in srgb, var(--accent) 35%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent) 8%, var(--bg-panel));
    }

    .onboarding-card.muted {
        border-color: var(--border-subtle);
        background: var(--bg-panel);
    }

    .card-icon {
        grid-row: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px; /* sized for 32px icon with alignment buffer */
        color: var(--text-muted);
    }

    .onboarding-card.accent .card-icon {
        color: var(--accent);
    }

    .card-labels {
        display: flex;
        flex-direction: column;
    }

    .card-label {
        font-size: var(--font-base);
        font-weight: var(--weight-semibold);
        color: var(--text);
        line-height: var(--leading);
    }

    .onboarding-card.accent .card-label {
        color: var(--accent);
    }

    .onboarding-card.muted .card-label {
        color: var(--text);
    }

    .card-desc {
        font-size: var(--font-sm);
        color: var(--text-muted);
        line-height: var(--leading);
    }

    @keyframes card-enter {
        from {
            transform: translateY(8px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .onboarding-card {
            animation: none;
            opacity: 1;
        }
    }
</style>
