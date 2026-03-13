<script lang="ts">
    import type { Component } from "svelte";
    import { onMount } from "svelte";
    import {
        ArrowsOutCardinalIcon,
        HandGrabbingIcon,
        HandTapIcon,
        MouseLeftClickIcon,
        MouseMiddleClickIcon,
        MouseRightClickIcon,
        MouseScrollIcon,
    } from "phosphor-svelte";
    import LongPressIcon from "./icons/LongPressIcon.svelte";
    import PinchIcon from "./icons/PinchIcon.svelte";
    import Node from "./Node.svelte";
    import { t } from "svelte-whisper";

    export let onDismiss: () => void;
    export let offsetX: number;
    export let offsetY: number;
    export let scale: number;

    type ChipData = {
        icon: Component;
        label: string;
        description: string;
    };

    /** Atk Boost (yellow branch, index 0) world position */
    const NODE_WORLD_X = 270;
    const NODE_WORLD_Y = 391;
    const NODE_RADIUS = 32;

    /** Empty area to the left of the tree root */
    const TREE_WORLD_X = 100;
    const TREE_WORLD_Y = 320;
    const TREE_SPOTLIGHT_RADIUS = 55;

    $: nodeScreenX = NODE_WORLD_X * scale + offsetX;
    $: nodeScreenY = NODE_WORLD_Y * scale + offsetY;
    $: nodeScreenRadius = NODE_RADIUS * scale;
    $: nodeSpotlightRadius = nodeScreenRadius + 12;

    $: treeScreenX = TREE_WORLD_X * scale + offsetX;
    $: treeScreenY = TREE_WORLD_Y * scale + offsetY;

    let isTouch = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    onMount(() => {
        isTouch = window.matchMedia("(pointer: coarse)").matches;
        return () => {
            if (dismissTimer) clearTimeout(dismissTimer);
        };
    });

    $: nodeChips = isTouch
        ? ([
              { icon: HandTapIcon, label: $t("onboarding.tap"), description: $t("onboarding.levelUp") },
              { icon: LongPressIcon, label: $t("onboarding.longPress"), description: $t("onboarding.options") },
          ] as ChipData[])
        : ([
              { icon: MouseLeftClickIcon, label: $t("onboarding.leftClick"), description: $t("onboarding.levelUp") },
              { icon: MouseRightClickIcon, label: $t("onboarding.rightClick"), description: $t("onboarding.options") },
              { icon: MouseMiddleClickIcon, label: $t("onboarding.middleClick"), description: $t("onboarding.levelDown") },
          ] as ChipData[]);

    $: treeChips = isTouch
        ? ([
              { icon: LongPressIcon, label: $t("onboarding.longPress"), description: $t("onboarding.treeOptions") },
              { icon: HandGrabbingIcon, label: $t("onboarding.swipe"), description: $t("onboarding.pan") },
              { icon: PinchIcon, label: $t("onboarding.pinch"), description: $t("onboarding.zoom") },
          ] as ChipData[])
        : ([
              { icon: MouseRightClickIcon, label: $t("onboarding.rightClick"), description: $t("onboarding.treeOptions") },
              { icon: ArrowsOutCardinalIcon, label: $t("onboarding.clickDrag"), description: $t("onboarding.pan") },
              { icon: MouseScrollIcon, label: $t("onboarding.scroll"), description: $t("onboarding.zoom") },
          ] as ChipData[]);

    let dismissing = false;

    function handleDismiss() {
        if (dismissing) return;
        dismissing = true;
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        if (prefersReducedMotion) {
            onDismiss();
        } else {
            dismissTimer = setTimeout(onDismiss, 300);
        }
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="onboarding-overlay"
    class:dismissing
    role="dialog"
    aria-modal="true"
    aria-label="Controls tutorial"
    tabindex="-1"
    on:pointerdown={handleDismiss}
>
    <!-- Dark backdrop with spotlight cutouts -->
    <svg class="onboarding-backdrop" aria-hidden="true">
        <defs>
            <radialGradient id="onboarding-node-fade">
                <stop offset="80%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
            </radialGradient>
            <radialGradient id="onboarding-tree-fade">
                <stop offset="75%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
            </radialGradient>
            <mask id="onboarding-mask">
                <rect width="100%" height="100%" fill="white" />
                <circle
                    cx={nodeScreenX}
                    cy={nodeScreenY}
                    r={nodeSpotlightRadius}
                    fill="url(#onboarding-node-fade)"
                />
                <circle
                    cx={treeScreenX}
                    cy={treeScreenY}
                    r={TREE_SPOTLIGHT_RADIUS}
                    fill="url(#onboarding-tree-fade)"
                />
            </mask>
        </defs>
        <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#onboarding-mask)"
        />
    </svg>

    <!-- Node clone at real tree position -->
    <div
        class="node-clone"
        style="left: {nodeScreenX}px; top: {nodeScreenY}px;"
        aria-hidden="true"
    >
        <div
            class="node-clone-inner"
            style="transform: scale({scale}); transform-origin: center;"
        >
            <Node
                id={-1}
                skillId="attack_boost"
                state="available"
                level={0}
                maxLevel={100}
                tier={0}
                label={$t("skills.attack_boost")}
                scale={scale}
                radius={1}
                region="bottom-left"
                showSkillName={true}
                showTier={true}
                x={32}
                y={32}
            />
        </div>
    </div>

    <!-- Node instruction cards (above the node) -->
    <div
        class="card-group node-card-group"
        style="left: {nodeScreenX}px; top: {nodeScreenY - nodeSpotlightRadius - 8}px;"
    >
        <span class="section-label accent">{$t("onboarding.nodesSection")}</span>
        {#each nodeChips as chip, i}
            <div class="onboarding-card accent" style="--card-index: {i}">
                <span class="card-icon" aria-hidden="true">
                    <svelte:component this={chip.icon} />
                </span>
                <span class="card-text">
                    <span class="card-label">{chip.label}</span>
                    <span class="card-desc">{chip.description}</span>
                </span>
            </div>
        {/each}
    </div>

    <!-- Tree spotlight ring -->
    <div
        class="spotlight-ring"
        style="left: {treeScreenX}px; top: {treeScreenY}px; width: {TREE_SPOTLIGHT_RADIUS * 2}px; height: {TREE_SPOTLIGHT_RADIUS * 2}px;"
    ></div>

    <!-- Tree instruction cards (beside the spotlight) -->
    <div
        class="card-group tree-card-group"
        style="left: {treeScreenX + TREE_SPOTLIGHT_RADIUS + 16}px; top: {treeScreenY}px;"
    >
        <span class="section-label muted">{$t("onboarding.treeSection")}</span>
        {#each treeChips as chip, i}
            <div class="onboarding-card muted" style="--card-index: {nodeChips.length + i}">
                <span class="card-icon" aria-hidden="true">
                    <svelte:component this={chip.icon} />
                </span>
                <span class="card-text">
                    <span class="card-label">{chip.label}</span>
                    <span class="card-desc">{chip.description}</span>
                </span>
            </div>
        {/each}
    </div>

    <!-- Dismiss hint -->
    <span class="onboarding-dismiss-hint">
        {isTouch ? $t("onboarding.dismissTap") : $t("onboarding.dismissClick")}
    </span>
</div>

<style>
    .onboarding-overlay {
        position: absolute;
        inset: 0;
        z-index: var(--z-index-context-menu);
        animation: overlay-fade-in 300ms ease both;
    }

    .onboarding-overlay.dismissing {
        animation: overlay-fade-out 300ms ease both;
    }

    .onboarding-backdrop {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }

    .node-clone {
        position: absolute;
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .node-clone-inner {
        position: relative;
        width: 64px;
        height: 64px;
    }

    .card-group {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        pointer-events: none;
        width: max-content;
    }

    .node-card-group {
        transform: translate(-50%, -100%);
        align-items: center;
    }

    .tree-card-group {
        transform: translateY(-50%);
    }

    .section-label {
        font-size: var(--font-xs);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        margin-bottom: var(--spacing-xs);
    }

    .section-label.accent {
        color: var(--accent);
    }

    .section-label.muted {
        color: var(--text-muted);
    }

    .onboarding-card {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        opacity: 0;
        animation: card-enter 250ms var(--ease-decel) both;
        animation-delay: calc(100ms + var(--card-index) * 60ms);
        white-space: nowrap;
    }

    .onboarding-card.accent {
        border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    }

    .onboarding-card.muted {
        border-color: rgba(255, 255, 255, 0.06);
    }

    .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        color: var(--text-muted);
    }

    .onboarding-card.accent .card-icon {
        color: var(--accent);
    }

    .card-text {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-sm);
    }

    .card-label {
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        color: var(--text);
    }

    .onboarding-card.accent .card-label {
        color: var(--accent);
    }

    .onboarding-card.muted .card-label {
        color: var(--text-muted);
    }

    .card-desc {
        font-size: var(--font-xs);
        color: var(--text-muted);
        opacity: 0.7;
    }

    .spotlight-ring {
        position: absolute;
        transform: translate(-50%, -50%);
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        pointer-events: none;
        animation: spotlight-pulse 3s ease-in-out infinite;
    }

    .onboarding-dismiss-hint {
        position: absolute;
        bottom: var(--spacing-lg);
        left: 50%;
        transform: translateX(-50%);
        font-size: var(--font-xs);
        color: var(--text-muted);
        opacity: 0.5;
        white-space: nowrap;
    }

    @keyframes overlay-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes overlay-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes card-enter {
        from {
            transform: translateY(6px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes spotlight-pulse {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 0.4; }
    }

    @media (prefers-reduced-motion: reduce) {
        .onboarding-overlay,
        .onboarding-overlay.dismissing {
            animation: none;
        }

        .onboarding-card {
            animation: none;
            opacity: 1;
        }

        .spotlight-ring {
            animation: none;
            opacity: 0.3;
        }
    }
</style>
