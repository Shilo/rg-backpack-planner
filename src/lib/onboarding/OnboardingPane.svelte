<script lang="ts">
    import type { Component } from "svelte";
    import OnboardingCard from "./OnboardingCard.svelte";
    import {
        computePaneRect,
        type Direction,
        type Rect,
    } from "./paneLayout";

    type CardData = { icon: Component; label: string | string[]; description: string };

    export let anchorRect: Rect;
    /** Preferred direction to place the pane relative to the spotlight. */
    export let direction: Direction = "up";
    export let stepNumber = 1;
    export let stepCount = 1;
    export let title = "";
    export let titleIcon: Component | null = null;
    export let variant: "accent" | "muted" = "accent";
    export let cards: CardData[] = [];
    export let viewportWidth: number = 0;
    export let viewportHeight: number = 0;
    /** Rects to avoid, checked in order. First is highest priority after screen bounds. */
    export let avoidRects: Rect[] = [];
    export let bounds: Rect = { top: 0, bottom: 0, left: 0, right: 0 };
    /** Padding from screen edges (px). */
    export let edgePadding: number = 0;
    /** Extra bottom padding (e.g. for bottom tab bar). */
    export let bottomEdgePadding: number = 0;
    /** The pane's own spotlight rect — treated as a hard constraint. */
    export let ownSpotlightRect: Rect = anchorRect;
    export let compact = false;

    let contentHeight = 0;
    let contentWidth = 0;

    $: measured =
        contentHeight > 0 &&
        contentWidth > 0 &&
        viewportWidth > 0 &&
        viewportHeight > 0;

    $: bestRect = (() => {
        if (!measured || viewportWidth === 0 || viewportHeight === 0) {
            return {
                top: anchorRect.top,
                bottom: anchorRect.top + contentHeight,
                left: anchorRect.left,
                right: anchorRect.left + contentWidth,
            };
        }

        return computePaneRect({
            anchorRect,
            paneSize: { width: contentWidth, height: contentHeight },
            direction,
            viewportWidth,
            viewportHeight,
            edgePadding,
            bottomEdgePadding,
            ownSpotlightRect,
            avoidRects,
        });
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
    class:compact
    style="left: {computedLeft}px; top: {computedTop}px;{measured
        ? ''
        : ' visibility: hidden;'}"
    bind:clientHeight={contentHeight}
    bind:clientWidth={contentWidth}
>
    <div class="pane-header">
        <div class="pane-header-card {variant}" class:compact>
            <div class="pane-header-main">
                {#if titleIcon}
                    <span class="title-icon {variant}" aria-hidden="true">
                        <svelte:component
                            this={titleIcon}
                            size={compact ? 18 : 20}
                        />
                    </span>
                {/if}
                <span class="pane-title">{title}</span>
            </div>
            <span class="pane-step-count">{stepNumber} / {stepCount}</span>
        </div>
    </div>
    <div class="cards-stack">
        {#each cards as card, i}
            <OnboardingCard
                icon={card.icon}
                label={card.label}
                description={card.description}
                {variant}
                index={i}
                {compact}
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

    .onboarding-pane.compact {
        gap: var(--spacing-sm);
        max-width: min(236px, calc(100vw - 24px));
    }

    .pane-header {
        display: contents;
    }

    .pane-header-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        min-width: 0;
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: calc(var(--radius) + 2px);
        border: 1px solid var(--border-subtle);
        box-shadow: var(--shadow);
        backdrop-filter: blur(var(--blur-sm));
        -webkit-backdrop-filter: blur(var(--blur-sm));
    }

    .pane-header-card.compact {
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) var(--spacing-sm);
    }

    .pane-header-card.accent {
        background:
            linear-gradient(
                135deg,
                color-mix(in srgb, var(--accent) 13%, var(--bg-raised)),
                color-mix(in srgb, var(--bg-raised) 92%, var(--surface))
            );
        border-color: color-mix(
            in srgb,
            var(--accent) 22%,
            var(--border-subtle)
        );
    }

    .pane-header-card.muted {
        background: var(--bg-panel);
        border-color: color-mix(
            in srgb,
            var(--text-muted) 18%,
            var(--border-subtle)
        );
    }

    .pane-header-main {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        min-width: 0;
        flex: 1;
    }

    .onboarding-pane.compact .pane-header-main {
        gap: var(--spacing-sm);
    }

    .title-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
    }

    .onboarding-pane.compact .title-icon {
        width: 28px;
    }

    .title-icon.accent {
        color: var(--text-muted);
    }

    .title-icon.muted {
        color: var(--text-muted);
    }

    .pane-title {
        font-size: var(--font-lg);
        font-weight: var(--weight-semibold);
        line-height: 1.1;
        color: var(--text);
        text-wrap: balance;
        min-width: 0;
    }

    .onboarding-pane.compact .pane-title {
        font-size: var(--font-base);
    }

    .pane-step-count {
        flex-shrink: 0;
        text-align: right;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking);
        color: var(--text-muted);
        padding-right: var(--spacing-xs);
    }

    .onboarding-pane.compact .pane-step-count {
        font-size: var(--font-xs);
    }

    .cards-stack {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .onboarding-pane.compact .cards-stack {
        gap: var(--spacing-xs);
    }
</style>
