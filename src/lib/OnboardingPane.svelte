<script lang="ts">
    import type { Component } from "svelte";
    import OnboardingCard from "./OnboardingCard.svelte";

    type CardData = { icon: Component; label: string; description: string };

    export let screenX: number;
    export let screenY: number;
    export let spotlightRadius: number;
    export let preferUp: boolean = true;
    export let sectionLabel: string;
    export let variant: "accent" | "muted" = "accent";
    export let cards: CardData[] = [];
    export let baseCardIndex: number = 0;
    export let viewportWidth: number = 0;
    export let viewportHeight: number = 0;
    export let avoidRect: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    } | null = null;
    export let bounds: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    } = { top: 0, bottom: 0, left: 0, right: 0 };

    const GAP = 14;

    let contentHeight = 0;
    let contentWidth = 0;

    $: measured = contentHeight > 0 && contentWidth > 0;

    $: computedTop = (() => {
        if (!measured || viewportHeight === 0) return screenY;

        const spaceAbove = screenY - spotlightRadius - GAP;
        const spaceBelow =
            viewportHeight - screenY - spotlightRadius - GAP;

        let goUp = preferUp;
        if (goUp && contentHeight > spaceAbove && contentHeight <= spaceBelow) {
            goUp = false;
        } else if (
            !goUp &&
            contentHeight > spaceBelow &&
            contentHeight <= spaceAbove
        ) {
            goUp = true;
        }

        let top: number;
        if (goUp) {
            top = screenY - spotlightRadius - GAP - contentHeight;
        } else {
            top = screenY + spotlightRadius + GAP;
        }

        // Avoid sibling overlap
        if (avoidRect) {
            const myLeft = screenX - contentWidth / 2;
            const myRight = myLeft + contentWidth;
            const horizontalOverlap =
                myLeft < avoidRect.right && myRight > avoidRect.left;

            if (horizontalOverlap) {
                const myBottom = top + contentHeight;
                const verticalOverlap =
                    top < avoidRect.bottom && myBottom > avoidRect.top;

                if (verticalOverlap) {
                    if (goUp) {
                        const downTop = screenY + spotlightRadius + GAP;
                        if (downTop + contentHeight <= viewportHeight) {
                            top = downTop;
                        } else {
                            top = avoidRect.top - GAP - contentHeight;
                        }
                    } else {
                        const upTop =
                            screenY -
                            spotlightRadius -
                            GAP -
                            contentHeight;
                        if (upTop >= 0) {
                            top = upTop;
                        } else {
                            top = avoidRect.bottom + GAP;
                        }
                    }
                }
            }
        }

        return Math.max(0, Math.min(viewportHeight - contentHeight, top));
    })();

    $: computedLeft = (() => {
        if (!measured || viewportWidth === 0) return screenX;
        const left = screenX - contentWidth / 2;
        return Math.max(0, Math.min(viewportWidth - contentWidth, left));
    })();

    $: bounds = {
        top: computedTop,
        bottom: computedTop + contentHeight,
        left: computedLeft,
        right: computedLeft + contentWidth,
    };
</script>

<div
    class="onboarding-pane"
    style="left: {computedLeft}px; top: {computedTop}px;{measured
        ? ''
        : ' visibility: hidden;'}"
    bind:clientHeight={contentHeight}
    bind:clientWidth={contentWidth}
>
    <span class="section-badge {variant}">{sectionLabel}</span>
    <div class="cards-stack">
        {#each cards as card, i}
            <OnboardingCard
                icon={card.icon}
                label={card.label}
                description={card.description}
                {variant}
                index={baseCardIndex + i}
            />
        {/each}
    </div>
</div>

<style>
    .onboarding-pane {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        pointer-events: none;
        width: max-content;
        max-width: min(320px, 85vw);
    }

    .section-badge {
        display: inline-block;
        width: fit-content;
        font-size: var(--font-xs);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        padding: 2px 10px;
        border-radius: var(--radius-full);
        opacity: 0;
        animation: badge-enter 200ms var(--ease-decel) both;
    }

    .section-badge.accent {
        color: var(--accent);
        background: color-mix(in srgb, var(--accent) 15%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    }

    .section-badge.muted {
        color: var(--text-muted);
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .cards-stack {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    @keyframes badge-enter {
        from {
            transform: translateY(4px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .section-badge {
            animation: none;
            opacity: 1;
        }
    }
</style>
