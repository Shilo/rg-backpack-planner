<script lang="ts">
    import type { Component } from "svelte";

    export let icon: Component;
    export let label: string;
    export let description: string;
    export let variant: "accent" | "muted" = "accent";
    export let index: number = 0;
</script>

<div class="onboarding-card {variant}" style="--card-index: {index}">
    <span class="card-icon" aria-hidden="true">
        <svelte:component this={icon} />
    </span>
    <span class="card-label">{label}</span>
    <span class="card-desc">{description}</span>
</div>

<style>
    .onboarding-card {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: auto auto;
        column-gap: var(--spacing-lg);
        row-gap: 2px;
        padding: var(--spacing-lg) var(--spacing-lg);
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--radius);
        backdrop-filter: blur(var(--blur-md));
        -webkit-backdrop-filter: blur(var(--blur-md));
        opacity: 0;
        animation: card-enter 280ms var(--ease-decel) both;
        animation-delay: calc(150ms + var(--card-index) * 70ms);
        white-space: nowrap;
    }

    .onboarding-card.accent {
        border-color: color-mix(in srgb, var(--accent) 30%, transparent);
        background: color-mix(in srgb, var(--accent) 6%, rgba(0, 0, 0, 0.5));
    }

    .onboarding-card.muted {
        border-color: rgba(255, 255, 255, 0.06);
    }

    .card-icon {
        grid-row: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        font-size: 24px;
        color: var(--text-muted);
    }

    .onboarding-card.accent .card-icon {
        color: var(--accent);
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
        color: var(--text-muted);
    }

    .card-desc {
        font-size: var(--font-sm);
        color: var(--text-muted);
        opacity: 0.8;
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
