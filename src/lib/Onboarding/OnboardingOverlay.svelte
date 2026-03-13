<script lang="ts">
    import type { Component } from "svelte";
    import { onMount, getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type {
        Node as NodeType,
        LevelsByIndex,
        NodeIndex,
    } from "../../types/tree";
    import {
        ArrowsOutCardinalIcon,
        CursorClickIcon,
        HandGrabbingIcon,
        HandTapIcon,
        MouseLeftClickIcon,
        MouseMiddleClickIcon,
        MouseRightClickIcon,
        MouseScrollIcon,
    } from "phosphor-svelte";
    import LongPressIcon from "../icons/LongPressIcon.svelte";
    import PinchIcon from "../icons/PinchIcon.svelte";
    import Node, { NODE_RADIUS_PX } from "../Node.svelte";
    import OnboardingPane from "./OnboardingPane.svelte";
    import { TREE_ROOT_X, TREE_ROOT_Y } from "../../config/baseTree";
    import { t } from "svelte-whisper";

    export let onDismiss: () => void;
    export let offsetX: number;
    export let offsetY: number;
    export let scale: number;
    export let targetNodeIndex: NodeIndex = 0;
    export let emptySpaceWorldX: number = 190;
    export let emptySpaceWorldY: number = 342;

    type CardData = {
        icon: Component;
        label: string | string[];
        description: string;
    };

    const SPOTLIGHT_PAD = 12;

    const treeData =
        getContext<Writable<{ nodes: NodeType[]; levels: LevelsByIndex }>>(
            "tree",
        );

    // Resolve target node from tree context
    $: targetNode = $treeData.nodes[targetNodeIndex];

    $: targetRegion = (() => {
        if (!targetNode) return "bottom-left" as const;
        if (targetNode.x > TREE_ROOT_X) return "right" as const;
        if (targetNode.y < TREE_ROOT_Y) return "top-left" as const;
        return "bottom-left" as const;
    })();

    // Node screen position (dynamic from tree data)
    $: nodeRadius = (targetNode?.radius ?? 1) * NODE_RADIUS_PX;
    $: nodeScreenX = (targetNode?.x ?? 0) * scale + offsetX;
    $: nodeScreenY = (targetNode?.y ?? 0) * scale + offsetY;
    $: nodeScreenRadius = nodeRadius * scale;
    $: nodeSpotlightRadius = nodeScreenRadius + SPOTLIGHT_PAD;

    // Empty space screen position (scales with tree transform)
    $: treeScreenX = emptySpaceWorldX * scale + offsetX;
    $: treeScreenY = emptySpaceWorldY * scale + offsetY;
    $: treeSpotlightRadius = Math.round(nodeSpotlightRadius * 0.8);

    // Viewport dimensions (measured from overlay element)
    let viewportWidth = 0;
    let viewportHeight = 0;

    // Node pane bounds for overlap prevention
    let nodePaneBounds = { top: 0, bottom: 0, left: 0, right: 0 };

    // Spotlight bounding rects (circle → axis-aligned rect)
    $: nodeSpotlightRect = {
        top: nodeScreenY - nodeSpotlightRadius,
        bottom: nodeScreenY + nodeSpotlightRadius,
        left: nodeScreenX - nodeSpotlightRadius,
        right: nodeScreenX + nodeSpotlightRadius,
    };
    $: treeSpotlightRect = {
        top: treeScreenY - treeSpotlightRadius,
        bottom: treeScreenY + treeSpotlightRadius,
        left: treeScreenX - treeSpotlightRadius,
        right: treeScreenX + treeSpotlightRadius,
    };

    // Avoid zones for each pane — ordered by priority (screen bounds enforced by clamping)
    // 1. sibling pane, 2. own spotlight, 3. other spotlight
    $: nodeAvoidRects = [nodeSpotlightRect, treeSpotlightRect];
    $: treeAvoidRects = [nodePaneBounds, treeSpotlightRect, nodeSpotlightRect];

    const nodePaneDirection = "right" as const;
    const treePaneDirection = "left" as const;

    let panePadding = 0;
    let isTouch = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    let overlayEl: HTMLDivElement;
    let dismissBarHeight = 0;

    // Intentionally blocks all keyboard input while overlay is active to prevent
    // tree interactions (panning, tab switching, etc.) behind the tutorial.
    function handleKeydown(event: KeyboardEvent) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") {
            handleDismiss();
        }
    }

    onMount(() => {
        isTouch = window.matchMedia("(pointer: coarse)").matches;
        panePadding =
            parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue(
                    "--spacing-lg",
                ),
            ) || 12;
        window.addEventListener("keydown", handleKeydown, true);
        return () => {
            window.removeEventListener("keydown", handleKeydown, true);
            if (dismissTimer) clearTimeout(dismissTimer);
        };
    });

    $: nodeCards = isTouch
        ? ([
              {
                  icon: HandTapIcon,
                  label: $t("onboarding.tap"),
                  description: $t("onboarding.levelUp"),
              },
              {
                  icon: LongPressIcon,
                  label: $t("onboarding.longPress"),
                  description: $t("onboarding.options"),
              },
          ] as CardData[])
        : ([
              {
                  icon: MouseLeftClickIcon,
                  label: $t("onboarding.leftClick"),
                  description: $t("onboarding.levelUp"),
              },
              {
                  icon: MouseRightClickIcon,
                  label: $t("onboarding.rightClick"),
                  description: $t("onboarding.options"),
              },
              {
                  icon: MouseMiddleClickIcon,
                  label: [
                      $t("onboarding.middleClick"),
                      $t("onboarding.shiftLeftClick"),
                  ],
                  description: $t("onboarding.levelDown"),
              },
          ] as CardData[]);

    $: treeCards = isTouch
        ? ([
              {
                  icon: LongPressIcon,
                  label: $t("onboarding.longPress"),
                  description: $t("onboarding.treeOptions"),
              },
              {
                  icon: HandGrabbingIcon,
                  label: $t("onboarding.swipe"),
                  description: $t("onboarding.pan"),
              },
              {
                  icon: PinchIcon,
                  label: $t("onboarding.pinch"),
                  description: $t("onboarding.zoom"),
              },
          ] as CardData[])
        : ([
              {
                  icon: MouseRightClickIcon,
                  label: $t("onboarding.rightClick"),
                  description: $t("onboarding.treeOptions"),
              },
              {
                  icon: ArrowsOutCardinalIcon,
                  label: $t("onboarding.clickDrag"),
                  description: $t("onboarding.pan"),
              },
              {
                  icon: MouseScrollIcon,
                  label: $t("onboarding.scroll"),
                  description: $t("onboarding.zoom"),
              },
          ] as CardData[]);

    let dismissing = false;

    function handlePointerDismiss(event: PointerEvent) {
        if (dismissing) return;
        dismissing = true;

        // Hide overlay from elementFromPoint so we find the real target behind
        overlayEl.style.visibility = "hidden";
        const target = document.elementFromPoint(event.clientX, event.clientY);
        overlayEl.style.visibility = "";

        // Make overlay non-interactive so real pointerup reaches the target
        overlayEl.style.pointerEvents = "none";

        // Forward the pointer event to the element behind the overlay
        if (target) {
            target.dispatchEvent(
                new PointerEvent("pointerdown", {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    screenX: event.screenX,
                    screenY: event.screenY,
                    pointerId: event.pointerId,
                    pointerType: event.pointerType,
                    isPrimary: event.isPrimary,
                    button: event.button,
                    buttons: event.buttons,
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                }),
            );
        }

        // Animate out then remove
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        if (prefersReducedMotion) {
            onDismiss();
        } else {
            dismissTimer = setTimeout(onDismiss, 250);
        }
    }

    function handleDismiss() {
        if (dismissing) return;
        dismissing = true;
        if (overlayEl) {
            overlayEl.style.pointerEvents = "none";
        }
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        if (prefersReducedMotion) {
            onDismiss();
        } else {
            dismissTimer = setTimeout(onDismiss, 250);
        }
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- aria-label intentionally not localized to keep i18n minimal -->
<div
    class="onboarding-overlay"
    class:dismissing
    role="dialog"
    aria-modal="true"
    aria-label="Controls tutorial"
    tabindex="-1"
    on:pointerdown={handlePointerDismiss}
    bind:this={overlayEl}
    bind:clientWidth={viewportWidth}
    bind:clientHeight={viewportHeight}
>
    <!-- No backdrop blur — Chromium doesn't support backdrop-filter on masked
         elements (https://issues.chromium.org/issues/41465359). -->

    <!-- Dark backdrop with spotlight cutouts -->
    <svg class="onboarding-backdrop" aria-hidden="true">
        <defs>
            <radialGradient id="onboarding-node-fade">
                <stop offset="75%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
            </radialGradient>
            <radialGradient id="onboarding-tree-fade">
                <stop offset="70%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
            </radialGradient>
            <!-- Only one overlay mounts at a time so static IDs are safe -->
            <mask id="onboarding-cutout-mask">
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
                    r={treeSpotlightRadius}
                    fill="url(#onboarding-tree-fade)"
                />
            </mask>
        </defs>
        <rect
            width="100%"
            height="100%"
            fill="var(--backdrop-overlay)"
            mask="url(#onboarding-cutout-mask)"
        />
    </svg>

    <!-- Node clone at real tree position -->
    {#if targetNode}
        <div
            class="node-clone"
            style="left: {nodeScreenX}px; top: {nodeScreenY}px;"
            aria-hidden="true"
        >
            <div
                class="node-clone-inner"
                style="transform: scale({scale}); transform-origin: center; width: {nodeRadius *
                    2}px; height: {nodeRadius * 2}px;"
            >
                <Node
                    id={-1}
                    skillId={targetNode.skillId}
                    state="available"
                    level={0}
                    maxLevel={targetNode.maxLevel}
                    tier={0}
                    label={$t(`skills.${targetNode.skillId}`)}
                    {scale}
                    radius={targetNode.radius ?? 1}
                    region={targetRegion}
                    showSkillName={true}
                    showTier={true}
                    x={nodeRadius}
                    y={nodeRadius}
                />
            </div>
        </div>
    {/if}

    <!-- Node spotlight ring -->
    <div
        class="spotlight-ring"
        style="left: {nodeScreenX}px; top: {nodeScreenY}px; width: {nodeSpotlightRadius *
            2}px; height: {nodeSpotlightRadius * 2}px;"
    ></div>

    <!-- Tree spotlight ring -->
    <div
        class="spotlight-ring"
        style="left: {treeScreenX}px; top: {treeScreenY}px; width: {treeSpotlightRadius *
            2}px; height: {treeSpotlightRadius * 2}px;"
    ></div>

    <!-- Dismiss hint background — behind spotlight rings -->
    <div class="dismiss-bg"></div>

    <!-- Dismiss hint card — above spotlights, behind panes -->
    <div class="dismiss-text-bar" bind:clientHeight={dismissBarHeight}>
        <div class="dismiss-card">
            <span class="dismiss-icon" aria-hidden="true">
                {#if isTouch}
                    <HandTapIcon size={16} />
                {:else}
                    <CursorClickIcon size={16} />
                {/if}
            </span>
            <span class="dismiss-text">
                {isTouch
                    ? $t("onboarding.dismissTap")
                    : $t("onboarding.dismissClick")}
            </span>
        </div>
    </div>

    <!-- Node instruction pane (avoids tree spotlight) -->
    <OnboardingPane
        screenX={nodeScreenX}
        screenY={nodeScreenY}
        spotlightRadius={nodeSpotlightRadius}
        direction={nodePaneDirection}
        sectionLabel={$t("onboarding.nodesSection")}
        variant="accent"
        cards={nodeCards}
        baseCardIndex={0}
        {viewportWidth}
        {viewportHeight}
        avoidRects={nodeAvoidRects}
        ownSpotlightRect={nodeSpotlightRect}
        edgePadding={panePadding}
        bottomEdgePadding={dismissBarHeight}
        bind:bounds={nodePaneBounds}
    />

    <!-- Tree instruction pane (avoids node pane + node spotlight) -->
    <OnboardingPane
        screenX={treeScreenX}
        screenY={treeScreenY}
        spotlightRadius={treeSpotlightRadius}
        direction={treePaneDirection}
        sectionLabel={$t("onboarding.treeSection")}
        variant="muted"
        cards={treeCards}
        baseCardIndex={nodeCards.length}
        {viewportWidth}
        {viewportHeight}
        avoidRects={treeAvoidRects}
        ownSpotlightRect={treeSpotlightRect}
        edgePadding={panePadding}
        bottomEdgePadding={dismissBarHeight}
    />
</div>

<style>
    .onboarding-overlay {
        position: absolute;
        inset: 0;
        z-index: var(--z-index-context-menu);
        animation: overlay-fade-in 300ms ease both;
    }

    .onboarding-overlay.dismissing {
        animation: overlay-fade-out 250ms ease both;
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
        z-index: 1;
    }

    .node-clone-inner {
        position: relative;
    }

    .spotlight-ring {
        position: absolute;
        transform: translate(-50%, -50%);
        border: 2px dashed color-mix(in srgb, var(--text) 60%, transparent);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
    }

    .dismiss-bg,
    .dismiss-text-bar {
        --_bar-h: calc(
            var(--tab-height) +
                max(var(--bar-pad, 12px), var(--safe-bottom, 0px))
        );
        --_fade: 24px;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: calc(var(--_bar-h) + var(--_fade));
        pointer-events: none;
        opacity: 0;
        animation: hint-fade-in 400ms ease both;
        animation-delay: 800ms;
        padding-bottom: var(--safe-bottom, 0px);
    }

    .dismiss-bg {
        background: linear-gradient(
            to bottom,
            transparent 0%,
            var(--bg) var(--_fade)
        );
    }

    .dismiss-text-bar {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: var(--spacing-lg);
        z-index: 2;
    }

    .dismiss-card {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) var(--spacing-lg);
        background: var(--bg-panel);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        font-size: var(--font-sm);
        color: var(--text-muted);
        white-space: nowrap;
    }

    .dismiss-icon {
        display: flex;
        align-items: center;
        opacity: var(--opacity-disabled);
    }

    .dismiss-text {
        letter-spacing: var(--tracking);
    }

    @keyframes overlay-fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes overlay-fade-out {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    @keyframes hint-fade-in {
        from {
            opacity: 0;
            transform: translateY(4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .onboarding-overlay,
        .onboarding-overlay.dismissing {
            animation: none;
        }

        .dismiss-bg,
        .dismiss-text-bar {
            animation: none;
            opacity: 1;
        }
    }
</style>
