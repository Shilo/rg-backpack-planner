<script lang="ts">
    import type { Component } from "svelte";
    import OnboardingCard from "./OnboardingCard.svelte";

    type CardData = { icon: Component; label: string; description: string };
    type Rect = { top: number; bottom: number; left: number; right: number };

    export let screenX: number;
    export let screenY: number;
    export let spotlightRadius: number;
    /** Preferred direction to place the pane relative to the spotlight. */
    export let direction: "up" | "down" | "left" | "right" = "up";
    export let sectionLabel: string;
    export let variant: "accent" | "muted" = "accent";
    export let cards: CardData[] = [];
    export let baseCardIndex: number = 0;
    export let viewportWidth: number = 0;
    export let viewportHeight: number = 0;
    /** Rects to avoid, checked in order. First is highest priority after screen bounds. */
    export let avoidRects: Rect[] = [];
    export let bounds: Rect = { top: 0, bottom: 0, left: 0, right: 0 };
    /** Padding from screen edges (px). */
    export let edgePadding: number = 0;
    /** Extra bottom padding (e.g. for dismiss bar). */
    export let bottomEdgePadding: number = 0;
    /** The pane's own spotlight rect — treated as a hard constraint. */
    export let ownSpotlightRect: Rect = { top: 0, bottom: 0, left: 0, right: 0 };

    const GAP = 14;

    let contentHeight = 0;
    let contentWidth = 0;

    $: measured =
        contentHeight > 0 &&
        contentWidth > 0 &&
        viewportWidth > 0 &&
        viewportHeight > 0;

    /** Compute the clamped rect for the pane placed in a given direction. */
    function rectForDirection(dir: "up" | "down" | "left" | "right"): Rect {
        let top: number;
        let left: number;

        switch (dir) {
            case "up":
                top = screenY - spotlightRadius - GAP - contentHeight;
                left = screenX - contentWidth / 2;
                break;
            case "down":
                top = screenY + spotlightRadius + GAP;
                left = screenX - contentWidth / 2;
                break;
            case "left":
                top = screenY - contentHeight / 2;
                left = screenX - spotlightRadius - GAP - contentWidth;
                break;
            case "right":
                top = screenY - contentHeight / 2;
                left = screenX + spotlightRadius + GAP;
                break;
        }

        // Clamp to viewport with edge padding (bottom uses extra padding for dismiss bar)
        const effectiveBottomPad = Math.max(edgePadding, bottomEdgePadding);
        top = Math.max(edgePadding, Math.min(viewportHeight - contentHeight - effectiveBottomPad, top));
        left = Math.max(edgePadding, Math.min(viewportWidth - contentWidth - edgePadding, left));

        return {
            top,
            bottom: top + contentHeight,
            left,
            right: left + contentWidth,
        };
    }

    function overlapArea(a: Rect, b: Rect): number {
        const dx = Math.max(
            0,
            Math.min(a.right, b.right) - Math.max(a.left, b.left),
        );
        const dy = Math.max(
            0,
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
        );
        return dx * dy;
    }

    /** Directions to try, in preference order starting from the requested one. */
    const DIRECTION_FALLBACKS: Record<
        string,
        ("up" | "down" | "left" | "right")[]
    > = {
        up: ["up", "down", "left", "right"],
        down: ["down", "up", "right", "left"],
        left: ["left", "right", "down", "up"],
        right: ["right", "left", "down", "up"],
    };

    /** Total overlap area of a candidate rect against all avoid zones. */
    function totalOverlap(candidate: Rect): number {
        let total = 0;
        for (const avoid of avoidRects) {
            total += overlapArea(candidate, avoid);
        }
        return total;
    }

    $: bestRect = (() => {
        // Reference variables used inside rectForDirection so Svelte tracks them
        void contentHeight, contentWidth, spotlightRadius, edgePadding, bottomEdgePadding;

        if (!measured || viewportWidth === 0 || viewportHeight === 0) {
            return { top: screenY, left: screenX };
        }

        const candidates = DIRECTION_FALLBACKS[direction];
        const rects = candidates.map((dir) => rectForDirection(dir));

        // Own spotlight overlap for each direction
        const ownOverlaps = rects.map((r) => overlapArea(r, ownSpotlightRect));

        // 1. Prefer directions with zero overlap on everything (own spotlight + avoid rects)
        for (let i = 0; i < rects.length; i++) {
            if (ownOverlaps[i] === 0 && totalOverlap(rects[i]) === 0) {
                return rects[i];
            }
        }

        // 2. Among directions that don't overlap own spotlight, pick least avoidRect overlap
        const clearOfOwn = rects
            .map((r, i) => ({ rect: r, idx: i }))
            .filter((_, i) => ownOverlaps[i] === 0);

        if (clearOfOwn.length > 0) {
            let best = clearOfOwn[0];
            let bestArea = totalOverlap(best.rect);
            for (let i = 1; i < clearOfOwn.length; i++) {
                const area = totalOverlap(clearOfOwn[i].rect);
                if (area < bestArea) {
                    best = clearOfOwn[i];
                    bestArea = area;
                }
            }
            return best.rect;
        }

        // 3. All directions overlap own spotlight — pick the least own-spotlight overlap
        let best = rects[0];
        let bestArea = ownOverlaps[0];
        for (let i = 1; i < rects.length; i++) {
            if (ownOverlaps[i] < bestArea) {
                best = rects[i];
                bestArea = ownOverlaps[i];
            }
        }
        return best;
    })();

    $: computedTop = bestRect.top;
    $: computedLeft = bestRect.left;

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
        z-index: 3;
    }

    .section-badge {
        display: inline-block;
        width: fit-content;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        padding: var(--spacing-xs) var(--spacing-lg);
        border-radius: var(--radius-full);
        opacity: 0;
        animation: badge-enter 200ms var(--ease-decel) both;
    }

    .section-badge.accent {
        color: var(--accent);
        background: color-mix(in srgb, var(--accent) 12%, var(--bg-panel));
        border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    }

    .section-badge.muted {
        color: var(--text-muted);
        background: var(--bg-panel);
        border: 1px solid var(--border-subtle);
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
