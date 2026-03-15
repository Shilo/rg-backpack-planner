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
    import { NODE_RADIUS_PX } from "../Node.svelte";
    import { TREE_ROOT_X, TREE_ROOT_Y } from "../../config/baseTree";
    import { t } from "svelte-whisper";
    import OnboardingPane from "./OnboardingPane.svelte";
    import type { Direction, Rect } from "./paneLayout";

    export let onDismiss: () => void;
    export let offsetX: number;
    export let offsetY: number;
    export let scale: number;
    export let targetNodeIndex: NodeIndex = 0;
    export let emptySpaceWorldX: number = 180;
    export let emptySpaceWorldY: number = 342;

    type CardData = {
        icon: Component;
        label: string | string[];
        description: string;
    };

    const SPOTLIGHT_PAD = 12;
    const ROOT_SPOTLIGHT_RADIUS = 34;
    const HUD_SPOTLIGHT_RADIUS = 18;
    const EMPTY_RECT: Rect = { top: 0, bottom: 0, left: 0, right: 0 };

    const treeData =
        getContext<Writable<{ nodes: NodeType[]; levels: LevelsByIndex }>>(
            "tree",
        );

    let overlayEl: HTMLDivElement | null = null;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let panePadding = 0;
    let bottomPadding = 0;
    let isTouch = false;
    let hasResetAction = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    let hudPaneBounds: Rect = { ...EMPTY_RECT };
    let nodePaneBounds: Rect = { ...EMPTY_RECT };
    let rootPaneBounds: Rect = { ...EMPTY_RECT };
    let treePaneBounds: Rect = { ...EMPTY_RECT };
    let hudSpotlightRect: Rect = { ...EMPTY_RECT };

    $: targetNode = $treeData.nodes[targetNodeIndex];
    $: targetRegion = (() => {
        if (!targetNode) return "bottom-left" as const;
        if (targetNode.x > TREE_ROOT_X) return "right" as const;
        if (targetNode.y < TREE_ROOT_Y) return "top-left" as const;
        return "bottom-left" as const;
    })();

    $: compactLayout =
        viewportWidth > 0 &&
        viewportHeight > 0 &&
        (viewportWidth < 680 || viewportHeight < 680);
    $: effectivePanePadding = compactLayout
        ? Math.max(8, panePadding - 2)
        : panePadding;

    $: nodeRadius = (targetNode?.radius ?? 1) * NODE_RADIUS_PX;
    $: nodeScreenX = (targetNode?.x ?? 0) * scale + offsetX;
    $: nodeScreenY = (targetNode?.y ?? 0) * scale + offsetY;
    $: nodeScreenRadius = nodeRadius * scale;
    $: nodeSpotlightRadius = nodeScreenRadius + SPOTLIGHT_PAD;

    $: rootScreenX = TREE_ROOT_X * scale + offsetX;
    $: rootScreenY = TREE_ROOT_Y * scale + offsetY;

    $: treeScreenX = emptySpaceWorldX * scale + offsetX;
    $: treeScreenY = emptySpaceWorldY * scale + offsetY;
    $: treeSpotlightRadius = Math.max(
        26,
        Math.round(nodeSpotlightRadius * 0.8),
    );

    function circleRect(x: number, y: number, radius: number): Rect {
        return {
            top: y - radius,
            bottom: y + radius,
            left: x - radius,
            right: x + radius,
        };
    }

    function rectWidth(rect: Rect) {
        return rect.right - rect.left;
    }

    function rectHeight(rect: Rect) {
        return rect.bottom - rect.top;
    }

    function resolveElementRect(
        selector: string,
        paddingX: number,
        paddingY = paddingX,
    ): Rect | null {
        if (!overlayEl || typeof document === "undefined") return null;
        const target = document.querySelector(selector);
        if (!(target instanceof HTMLElement)) return null;
        const overlayRect = overlayEl.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        return {
            top: targetRect.top - overlayRect.top - paddingY,
            bottom: targetRect.bottom - overlayRect.top + paddingY,
            left: targetRect.left - overlayRect.left - paddingX,
            right: targetRect.right - overlayRect.left + paddingX,
        };
    }

    function fallbackHudRect(): Rect {
        const width = compactLayout ? 116 : 148;
        const height = compactLayout ? 68 : 76;
        const top = effectivePanePadding;
        const left = Math.max(
            effectivePanePadding,
            viewportWidth - width - effectivePanePadding,
        );
        return {
            top,
            bottom: top + height,
            left,
            right: left + width,
        };
    }

    $: nodeSpotlightRect = circleRect(
        nodeScreenX,
        nodeScreenY,
        nodeSpotlightRadius,
    );
    $: rootSpotlightRect = circleRect(
        rootScreenX,
        rootScreenY,
        ROOT_SPOTLIGHT_RADIUS,
    );
    $: treeSpotlightRect = circleRect(
        treeScreenX,
        treeScreenY,
        treeSpotlightRadius,
    );
    $: {
        void overlayEl;
        void viewportWidth;
        void viewportHeight;
        hudSpotlightRect =
            resolveElementRect(".top-right-actions", 8, 8) ?? fallbackHudRect();
    }

    $: {
        void viewportWidth;
        void viewportHeight;
        hasResetAction =
            typeof document !== "undefined" &&
            !!document.querySelector(".top-right-actions .active-tree-reset");
    }

    let nodePaneDirection: Direction = "right";
    let rootPaneDirection: Direction = "right";
    let treePaneDirection: Direction = "left";
    const hudPaneDirection: Direction = "left";

    $: nodePaneDirection = targetRegion === "right" ? "left" : "right";
    $: rootPaneDirection = compactLayout ? "down" : "right";
    $: treePaneDirection = compactLayout ? "up" : "left";

    $: primaryInputIcon = isTouch ? HandTapIcon : MouseLeftClickIcon;
    $: primaryInputLabel = isTouch
        ? $t("onboarding.tap")
        : $t("onboarding.leftClick");

    $: hudCards = [
        {
            icon: primaryInputIcon,
            label: primaryInputLabel,
            description: $t("onboarding.techCrystalBudget"),
        },
        ...(hasResetAction
            ? [
                  {
                      icon: primaryInputIcon,
                      label: primaryInputLabel,
                      description: $t("onboarding.resetActiveTree"),
                  },
              ]
            : []),
    ] as CardData[];

    $: nodeCards = isTouch
        ? ([{
              icon: HandTapIcon,
              label: $t("onboarding.tap"),
              description: $t("onboarding.levelUp"),
          }, {
              icon: LongPressIcon,
              label: $t("onboarding.longPress"),
              description: $t("onboarding.options"),
          }] as CardData[])
        : ([{
              icon: MouseLeftClickIcon,
              label: $t("onboarding.leftClick"),
              description: $t("onboarding.levelUp"),
          }, {
              icon: MouseRightClickIcon,
              label: $t("onboarding.rightClick"),
              description: $t("onboarding.options"),
          }, {
              icon: MouseMiddleClickIcon,
              label: [
                  $t("onboarding.middleClick"),
                  $t("onboarding.shiftLeftClick"),
              ],
              description: $t("onboarding.levelDown"),
          }] as CardData[]);

    $: rootCards = [
        {
            icon: primaryInputIcon,
            label: primaryInputLabel,
            description: $t("onboarding.rootQuickSettings"),
        },
        {
            icon: primaryInputIcon,
            label: primaryInputLabel,
            description: $t("onboarding.rootPrimaryAction"),
        },
    ] as CardData[];

    $: treeCards = isTouch
        ? ([{
              icon: LongPressIcon,
              label: $t("onboarding.longPress"),
              description: $t("onboarding.treeOptions"),
          }, {
              icon: HandGrabbingIcon,
              label: $t("onboarding.swipe"),
              description: $t("onboarding.pan"),
          }, {
              icon: PinchIcon,
              label: $t("onboarding.pinch"),
              description: $t("onboarding.zoom"),
          }] as CardData[])
        : ([{
              icon: MouseRightClickIcon,
              label: $t("onboarding.rightClick"),
              description: $t("onboarding.treeOptions"),
          }, {
              icon: ArrowsOutCardinalIcon,
              label: $t("onboarding.clickDrag"),
              description: $t("onboarding.pan"),
          }, {
              icon: MouseScrollIcon,
              label: $t("onboarding.scroll"),
              description: $t("onboarding.zoom"),
          }] as CardData[]);

    $: nodeAvoidRects = [hudSpotlightRect, rootSpotlightRect, treeSpotlightRect];
    $: hudAvoidRects = [
        nodePaneBounds,
        nodeSpotlightRect,
        rootSpotlightRect,
        treeSpotlightRect,
    ];
    $: rootAvoidRects = [
        hudPaneBounds,
        nodePaneBounds,
        hudSpotlightRect,
        nodeSpotlightRect,
        treeSpotlightRect,
    ];
    $: treeAvoidRects = [
        hudPaneBounds,
        nodePaneBounds,
        rootPaneBounds,
        hudSpotlightRect,
        nodeSpotlightRect,
        rootSpotlightRect,
    ];

    let dismissing = false;

    function handleKeydown(event: KeyboardEvent) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") {
            handleDismiss();
        }
    }

    function handlePointerDismiss() {
        handleDismiss();
    }

    onMount(() => {
        isTouch = window.matchMedia("(pointer: coarse)").matches;
        const styles = getComputedStyle(document.documentElement);
        const cssFloat = (name: string, fallback: number) =>
            parseFloat(styles.getPropertyValue(name)) || fallback;
        panePadding = cssFloat("--spacing-lg", 12);
        const tabHeight = cssFloat("--tab-height", 0);
        const barPad = cssFloat("--bar-pad", 0);
        const safeBottom = cssFloat("--safe-bottom", 0);
        bottomPadding = tabHeight + Math.max(barPad, safeBottom) + panePadding;
        window.addEventListener("keydown", handleKeydown, true);
        window.addEventListener("pointerdown", handlePointerDismiss, true);
        return () => {
            window.removeEventListener("keydown", handleKeydown, true);
            window.removeEventListener(
                "pointerdown",
                handlePointerDismiss,
                true,
            );
            if (dismissTimer) clearTimeout(dismissTimer);
        };
    });

    function handleDismiss() {
        if (dismissing) return;
        dismissing = true;
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
    bind:this={overlayEl}
    class="onboarding-overlay"
    class:dismissing
    role="dialog"
    aria-modal="true"
    aria-label="Controls tutorial"
    tabindex="-1"
    bind:clientWidth={viewportWidth}
    bind:clientHeight={viewportHeight}
>
    <svg class="onboarding-backdrop" aria-hidden="true">
        <defs>
            <radialGradient id="onboarding-node-fade">
                <stop offset="75%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
            </radialGradient>
            <radialGradient id="onboarding-root-fade">
                <stop offset="72%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
            </radialGradient>
            <radialGradient id="onboarding-tree-fade">
                <stop offset="70%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
            </radialGradient>
            <mask id="onboarding-cutout-mask">
                <rect width="100%" height="100%" fill="white" />
                <circle
                    cx={nodeScreenX}
                    cy={nodeScreenY}
                    r={nodeSpotlightRadius}
                    fill="url(#onboarding-node-fade)"
                />
                <circle
                    cx={rootScreenX}
                    cy={rootScreenY}
                    r={ROOT_SPOTLIGHT_RADIUS}
                    fill="url(#onboarding-root-fade)"
                />
                <circle
                    cx={treeScreenX}
                    cy={treeScreenY}
                    r={treeSpotlightRadius}
                    fill="url(#onboarding-tree-fade)"
                />
                <rect
                    x={hudSpotlightRect.left}
                    y={hudSpotlightRect.top}
                    width={rectWidth(hudSpotlightRect)}
                    height={rectHeight(hudSpotlightRect)}
                    rx={HUD_SPOTLIGHT_RADIUS}
                    fill="black"
                />
            </mask>
        </defs>
        <rect
            width="100%"
            height="100%"
            fill="var(--backdrop-overlay-heavy)"
            mask="url(#onboarding-cutout-mask)"
        />
    </svg>

    <div
        class="spotlight-ring spotlight-ring--rect"
        style="left: {hudSpotlightRect.left}px; top: {hudSpotlightRect.top}px; width: {rectWidth(
            hudSpotlightRect,
        )}px; height: {rectHeight(
            hudSpotlightRect,
        )}px; border-radius: {HUD_SPOTLIGHT_RADIUS}px;"
    ></div>

    <div
        class="spotlight-ring spotlight-ring--circle"
        style="left: {nodeSpotlightRect.left}px; top: {nodeSpotlightRect.top}px; width: {rectWidth(
            nodeSpotlightRect,
        )}px; height: {rectHeight(nodeSpotlightRect)}px;"
    ></div>

    <div
        class="spotlight-ring spotlight-ring--circle"
        style="left: {rootSpotlightRect.left}px; top: {rootSpotlightRect.top}px; width: {rectWidth(
            rootSpotlightRect,
        )}px; height: {rectHeight(rootSpotlightRect)}px;"
    ></div>

    <div
        class="spotlight-ring spotlight-ring--circle"
        style="left: {treeSpotlightRect.left}px; top: {treeSpotlightRect.top}px; width: {rectWidth(
            treeSpotlightRect,
        )}px; height: {rectHeight(treeSpotlightRect)}px;"
    ></div>

    <div class="dismiss-card" class:compact={compactLayout}>
        <span class="dismiss-icon" aria-hidden="true">
            {#if isTouch}
                <HandTapIcon size={compactLayout ? 16 : 20} />
            {:else}
                <CursorClickIcon size={compactLayout ? 16 : 20} />
            {/if}
        </span>
        <span class="dismiss-text">
            {isTouch
                ? $t("onboarding.dismissTap")
                : $t("onboarding.dismissClick")}
        </span>
    </div>

    <OnboardingPane
        anchorRect={nodeSpotlightRect}
        direction={nodePaneDirection}
        sectionLabel={$t("onboarding.nodesSection")}
        variant="accent"
        cards={nodeCards}
        baseCardIndex={0}
        {viewportWidth}
        {viewportHeight}
        avoidRects={nodeAvoidRects}
        ownSpotlightRect={nodeSpotlightRect}
        edgePadding={effectivePanePadding}
        bottomEdgePadding={bottomPadding}
        bind:bounds={nodePaneBounds}
        compact={compactLayout}
    />

    <OnboardingPane
        anchorRect={hudSpotlightRect}
        direction={hudPaneDirection}
        sectionLabel={$t("onboarding.hudSection")}
        variant="muted"
        cards={hudCards}
        baseCardIndex={nodeCards.length}
        {viewportWidth}
        {viewportHeight}
        avoidRects={hudAvoidRects}
        ownSpotlightRect={hudSpotlightRect}
        edgePadding={effectivePanePadding}
        bottomEdgePadding={bottomPadding}
        bind:bounds={hudPaneBounds}
        compact={compactLayout}
    />

    <OnboardingPane
        anchorRect={rootSpotlightRect}
        direction={rootPaneDirection}
        sectionLabel={$t("onboarding.rootSection")}
        variant="accent"
        cards={rootCards}
        baseCardIndex={nodeCards.length + hudCards.length}
        {viewportWidth}
        {viewportHeight}
        avoidRects={rootAvoidRects}
        ownSpotlightRect={rootSpotlightRect}
        edgePadding={effectivePanePadding}
        bottomEdgePadding={bottomPadding}
        bind:bounds={rootPaneBounds}
        compact={compactLayout}
    />

    <OnboardingPane
        anchorRect={treeSpotlightRect}
        direction={treePaneDirection}
        sectionLabel={$t("onboarding.treeSection")}
        variant="muted"
        cards={treeCards}
        baseCardIndex={nodeCards.length + hudCards.length + rootCards.length}
        {viewportWidth}
        {viewportHeight}
        avoidRects={treeAvoidRects}
        ownSpotlightRect={treeSpotlightRect}
        edgePadding={effectivePanePadding}
        bottomEdgePadding={bottomPadding}
        bind:bounds={treePaneBounds}
        compact={compactLayout}
    />
</div>

<style>
    .onboarding-overlay {
        position: absolute;
        inset: 0;
        z-index: calc(var(--z-index-hud) + 1);
        pointer-events: none;
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

    .spotlight-ring {
        position: absolute;
        border: 2px dashed color-mix(in srgb, var(--text) 60%, transparent);
        pointer-events: none;
        z-index: 1;
    }

    .spotlight-ring--circle {
        border-radius: 999px;
    }

    .dismiss-card {
        position: absolute;
        bottom: max(var(--bar-pad, 12px), var(--safe-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        height: var(--tab-height);
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: 0 var(--spacing-lg);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        font-size: var(--font-base);
        color: var(--text-muted);
        white-space: nowrap;
        z-index: 2;
        animation: hint-fade-in 250ms ease both;
    }

    .dismiss-card.compact {
        height: auto;
        min-height: 32px;
        max-width: calc(100vw - 24px);
        padding: var(--spacing-xs) var(--spacing-md);
        gap: var(--spacing-sm);
        font-size: var(--font-sm);
        white-space: normal;
        text-align: center;
    }

    .dismiss-icon {
        display: flex;
        align-items: center;
        opacity: var(--opacity-disabled);
    }

    .dismiss-text {
        letter-spacing: var(--tracking);
    }

    @keyframes hint-fade-in {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
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

    @media (prefers-reduced-motion: reduce) {
        .onboarding-overlay,
        .onboarding-overlay.dismissing {
            animation: none;
        }

        .dismiss-card {
            animation: none;
            opacity: 1;
        }
    }
</style>
