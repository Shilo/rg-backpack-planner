<script lang="ts">
    import { getContext, onMount, tick } from "svelte";
    import type { Writable } from "svelte/store";
    import type {
        LevelsByIndex,
        Node as NodeType,
        NodeIndex,
    } from "../../types/tree";
    import {
        CursorClickIcon,
        HandTapIcon,
        MouseLeftClickIcon,
    } from "phosphor-svelte";
    import { NODE_RADIUS_PX } from "../Node.svelte";
    import { TREE_ROOT_X, TREE_ROOT_Y } from "../../config/baseTree";
    import { t } from "svelte-whisper";
    import OnboardingFooterNote from "./OnboardingFooterNote.svelte";
    import OnboardingPane from "./OnboardingPane.svelte";
    import type { Rect } from "./paneLayout";
    import {
        createOnboardingSteps,
        type OnboardingTarget,
    } from "./onboardingSteps";

    export let onDismiss: () => void;
    export let offsetX: number;
    export let offsetY: number;
    export let scale: number;
    export let targetNodeIndex: NodeIndex = 0;
    export let emptySpaceWorldX: number = 180;
    export let emptySpaceWorldY: number = 342;

    const SPOTLIGHT_PAD = 12;
    const ROOT_SPOTLIGHT_PAD = 10;
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
    let footerBottomOffset = 0;
    let footerHeight = 0;
    let isTouch = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    let currentStepIndex = 0;
    let activePaneBounds: Rect = { ...EMPTY_RECT };
    let dismissing = false;

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

    $: primaryInputIcon = isTouch ? HandTapIcon : MouseLeftClickIcon;
    $: primaryInputLabel = isTouch
        ? $t("onboarding.tap")
        : $t("onboarding.leftClick");

    $: steps = createOnboardingSteps({
        translate: (key, params) => $t(key, params),
        isTouch,
        primaryInputIcon,
        primaryInputLabel,
        compactLayout,
        targetRegion,
    });
    $: if (steps.length > 0 && currentStepIndex > steps.length - 1) {
        currentStepIndex = steps.length - 1;
    }
    $: activeStep = steps[currentStepIndex] ?? null;
    $: isFinalStep = currentStepIndex >= steps.length - 1;
    $: actionHint = isFinalStep
        ? isTouch
            ? $t("onboarding.startTap")
            : $t("onboarding.startClick")
        : isTouch
          ? $t("onboarding.continueTap")
          : $t("onboarding.continueClick");
    $: actionHintIcon = isTouch ? HandTapIcon : CursorClickIcon;

    $: nodeRadius = (targetNode?.radius ?? 1) * NODE_RADIUS_PX;
    $: nodeScreenX = (targetNode?.x ?? 0) * scale + offsetX;
    $: nodeScreenY = (targetNode?.y ?? 0) * scale + offsetY;
    $: nodeScreenRadius = nodeRadius * scale;

    $: rootScreenX = TREE_ROOT_X * scale + offsetX;
    $: rootScreenY = TREE_ROOT_Y * scale + offsetY;
    $: rootFallbackRadius = Math.max(28, 22 * scale + ROOT_SPOTLIGHT_PAD);

    $: treeScreenX = emptySpaceWorldX * scale + offsetX;
    $: treeScreenY = emptySpaceWorldY * scale + offsetY;
    $: treeSpotlightRadius = Math.max(
        28,
        Math.round((nodeScreenRadius + SPOTLIGHT_PAD) * 0.8),
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

    function rectCenterX(rect: Rect) {
        return rect.left + rectWidth(rect) / 2;
    }

    function rectCenterY(rect: Rect) {
        return rect.top + rectHeight(rect) / 2;
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
        const width = compactLayout ? 132 : 156;
        const height = compactLayout ? 72 : 82;
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

    $: nodeSpotlightRect =
        resolveElementRect(`[data-node-id="${targetNodeIndex}"]`, SPOTLIGHT_PAD) ??
        circleRect(nodeScreenX, nodeScreenY, nodeScreenRadius + SPOTLIGHT_PAD);
    $: rootSpotlightRect =
        resolveElementRect('[data-node-id="root"]', ROOT_SPOTLIGHT_PAD) ??
        circleRect(rootScreenX, rootScreenY, rootFallbackRadius);
    $: treeSpotlightRect = circleRect(
        treeScreenX,
        treeScreenY,
        treeSpotlightRadius,
    );
    $: hudSpotlightRect =
        resolveElementRect(".top-right-actions", 8, 8) ?? fallbackHudRect();

    function getSpotlightRect(target: OnboardingTarget): Rect {
        if (target === "node") return nodeSpotlightRect;
        if (target === "hud") return hudSpotlightRect;
        if (target === "root") return rootSpotlightRect;
        return treeSpotlightRect;
    }

    $: activeSpotlightRect = activeStep
        ? getSpotlightRect(activeStep.target)
        : EMPTY_RECT;
    $: activeSpotlightIsRect = activeStep?.target === "hud";
    $: footerReservedSpace = Math.max(
        bottomPadding,
        footerHeight + footerBottomOffset + panePadding,
    );

    function handleAdvance() {
        if (dismissing || !activeStep) return;
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex += 1;
            void tick().then(() => overlayEl?.focus());
            return;
        }
        dismissOnboarding();
    }

    function dismissOnboarding() {
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

    function blockEvent(event: Event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function handlePointerAdvance(event: PointerEvent) {
        blockEvent(event);
        if (dismissing) return;
        handleAdvance();
    }

    function handleClickBlock(event: MouseEvent) {
        blockEvent(event);
    }

    function handleWheelBlock(event: WheelEvent) {
        blockEvent(event);
    }

    function handleContextMenuBlock(event: MouseEvent) {
        blockEvent(event);
    }

    function handleKeydown(event: KeyboardEvent) {
        blockEvent(event);
        if (dismissing) return;
        if (event.key === "Enter" || event.key === " ") {
            handleAdvance();
        }
    }

    onMount(() => {
        isTouch = window.matchMedia("(pointer: coarse)").matches;
        currentStepIndex = 0;
        const styles = getComputedStyle(document.documentElement);
        const cssFloat = (name: string, fallback: number) =>
            parseFloat(styles.getPropertyValue(name)) || fallback;
        panePadding = cssFloat("--spacing-lg", 12);
        const tabHeight = cssFloat("--tab-height", 0);
        const barPad = cssFloat("--bar-pad", 0);
        const safeBottom = cssFloat("--safe-bottom", 0);
        footerBottomOffset = Math.max(barPad, safeBottom);
        bottomPadding = tabHeight + footerBottomOffset + panePadding;

        const blockingWheelOptions = { capture: true, passive: false } as const;
        window.addEventListener("keydown", handleKeydown, true);
        window.addEventListener("pointerdown", handlePointerAdvance, true);
        window.addEventListener("click", handleClickBlock, true);
        window.addEventListener("contextmenu", handleContextMenuBlock, true);
        window.addEventListener("wheel", handleWheelBlock, blockingWheelOptions);
        void tick().then(() => overlayEl?.focus());

        return () => {
            window.removeEventListener("keydown", handleKeydown, true);
            window.removeEventListener("pointerdown", handlePointerAdvance, true);
            window.removeEventListener("click", handleClickBlock, true);
            window.removeEventListener(
                "contextmenu",
                handleContextMenuBlock,
                true,
            );
            window.removeEventListener(
                "wheel",
                handleWheelBlock,
                blockingWheelOptions,
            );
            if (dismissTimer) clearTimeout(dismissTimer);
        };
    });
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
            <radialGradient id="onboarding-spotlight-fade">
                <stop offset="74%" stop-color="black" />
                <stop offset="100%" stop-color="white" />
            </radialGradient>
            <mask id="onboarding-cutout-mask">
                <rect width="100%" height="100%" fill="white" />
                {#if activeSpotlightIsRect}
                    <rect
                        x={activeSpotlightRect.left}
                        y={activeSpotlightRect.top}
                        width={rectWidth(activeSpotlightRect)}
                        height={rectHeight(activeSpotlightRect)}
                        rx={HUD_SPOTLIGHT_RADIUS}
                        fill="black"
                    />
                {:else}
                    <circle
                        cx={rectCenterX(activeSpotlightRect)}
                        cy={rectCenterY(activeSpotlightRect)}
                        r={rectWidth(activeSpotlightRect) / 2}
                        fill="url(#onboarding-spotlight-fade)"
                    />
                {/if}
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
        class="spotlight-ring"
        class:spotlight-ring--circle={!activeSpotlightIsRect}
        class:spotlight-ring--rect={activeSpotlightIsRect}
        style="left: {activeSpotlightRect.left}px; top: {activeSpotlightRect.top}px; width: {rectWidth(
            activeSpotlightRect,
        )}px; height: {rectHeight(
            activeSpotlightRect,
        )}px; border-radius: {activeSpotlightIsRect
            ? HUD_SPOTLIGHT_RADIUS
            : 999}px;"
    ></div>

    {#if activeStep}
        {#key activeStep.id}
            <OnboardingPane
                anchorRect={activeSpotlightRect}
                direction={activeStep.direction}
                title={activeStep.title}
                titleIcon={activeStep.titleIcon}
                variant={activeStep.variant}
                cards={activeStep.cards}
                stepNumber={currentStepIndex + 1}
                stepCount={steps.length}
                {viewportWidth}
                {viewportHeight}
                avoidRects={[]}
                ownSpotlightRect={activeSpotlightRect}
                edgePadding={effectivePanePadding}
                bottomEdgePadding={footerReservedSpace}
                bind:bounds={activePaneBounds}
                compact={compactLayout}
            />
        {/key}
    {/if}

    <div class="footer-wrap" bind:clientHeight={footerHeight}>
        <OnboardingFooterNote
            stepNumber={currentStepIndex + 1}
            stepCount={steps.length}
            hintText={actionHint}
            hintIcon={actionHintIcon}
            compact={compactLayout}
        />
    </div>
</div>

<style>
    .onboarding-overlay {
        position: absolute;
        inset: 0;
        z-index: calc(var(--z-index-hud) + 1);
        pointer-events: auto;
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

    .footer-wrap {
        position: absolute;
        left: 50%;
        bottom: max(var(--bar-pad, 12px), var(--safe-bottom, 0px));
        transform: translateX(-50%);
        z-index: 2;
        pointer-events: none;
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
    }
</style>
