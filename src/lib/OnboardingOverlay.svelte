<script lang="ts">
    import type { Component } from "svelte";
    import { onMount, getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type {
        Node as NodeType,
        LevelsByIndex,
        NodeIndex,
    } from "../types/tree";
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
    import Node, { NODE_RADIUS_PX } from "./Node.svelte";
    import OnboardingPane from "./OnboardingPane.svelte";
    import { TREE_ROOT_X, TREE_ROOT_Y } from "../config/baseTree";
    import { t } from "svelte-whisper";

    export let onDismiss: () => void;
    export let offsetX: number;
    export let offsetY: number;
    export let scale: number;
    export let targetNodeIndex: NodeIndex = 0;
    export let emptySpaceWorldX: number = 100;
    export let emptySpaceWorldY: number = 320;

    type CardData = {
        icon: Component;
        label: string;
        description: string;
    };

    const SPOTLIGHT_PAD = 12;
    const TREE_SPOTLIGHT_RADIUS = 55;

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

    // Empty space screen position
    $: treeScreenX = emptySpaceWorldX * scale + offsetX;
    $: treeScreenY = emptySpaceWorldY * scale + offsetY;

    // Viewport dimensions (measured from overlay element)
    let viewportWidth = 0;
    let viewportHeight = 0;

    // Node pane bounds for overlap prevention
    let nodePaneBounds = { top: 0, bottom: 0, left: 0, right: 0 };

    let isTouch = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    function handleKeydown(event: KeyboardEvent) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") {
            handleDismiss();
        }
    }

    onMount(() => {
        isTouch = window.matchMedia("(pointer: coarse)").matches;
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
                  label: $t("onboarding.middleClick"),
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
    bind:clientWidth={viewportWidth}
    bind:clientHeight={viewportHeight}
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
            fill="rgba(0,0,0,0.6)"
            mask="url(#onboarding-mask)"
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
                    scale={scale}
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

    <!-- Node instruction pane (prefers up) -->
    <OnboardingPane
        screenX={nodeScreenX}
        screenY={nodeScreenY}
        spotlightRadius={nodeSpotlightRadius}
        preferUp={true}
        sectionLabel={$t("onboarding.nodesSection")}
        variant="accent"
        cards={nodeCards}
        baseCardIndex={0}
        {viewportWidth}
        {viewportHeight}
        bind:bounds={nodePaneBounds}
    />

    <!-- Tree spotlight ring -->
    <div
        class="spotlight-ring"
        style="left: {treeScreenX}px; top: {treeScreenY}px; width: {TREE_SPOTLIGHT_RADIUS *
            2}px; height: {TREE_SPOTLIGHT_RADIUS * 2}px;"
    ></div>

    <!-- Tree instruction pane (prefers down, avoids node pane) -->
    <OnboardingPane
        screenX={treeScreenX}
        screenY={treeScreenY}
        spotlightRadius={TREE_SPOTLIGHT_RADIUS}
        preferUp={false}
        sectionLabel={$t("onboarding.treeSection")}
        variant="muted"
        cards={treeCards}
        baseCardIndex={nodeCards.length}
        {viewportWidth}
        {viewportHeight}
        avoidRect={nodePaneBounds}
    />

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
        backdrop-filter: blur(var(--blur-xs));
        -webkit-backdrop-filter: blur(var(--blur-xs));
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

    @keyframes spotlight-pulse {
        0%,
        100% {
            opacity: 0.2;
        }
        50% {
            opacity: 0.4;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .onboarding-overlay,
        .onboarding-overlay.dismissing {
            animation: none;
        }

        .spotlight-ring {
            animation: none;
            opacity: 0.3;
        }
    }
</style>
