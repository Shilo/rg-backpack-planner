<script lang="ts">
    import { onMount, tick } from "svelte";
    import { fly } from "svelte/transition";
    import type { Node as NodeType, NodeIndex } from "../../types/tree";
    import { HandTapIcon, MouseLeftClickIcon } from "phosphor-svelte";
    import { NODE_RADIUS_PX } from "../Node.svelte";
    import { TREE_ROOT_X, TREE_ROOT_Y } from "../../config/baseTree";
    import { t } from "svelte-whisper";
    import OnboardingFooterNote from "./OnboardingFooterNote.svelte";
    import OnboardingPane from "./OnboardingPane.svelte";
    import { overlapArea, type Rect } from "./paneLayout";
    import {
        createOnboardingSteps,
        type OnboardingTarget,
    } from "./onboardingSteps";
    import { toastsPaused } from "../toast";

    export let onDismiss: () => void;
    export let nodes: NodeType[] = [];
    export let offsetX = 0;
    export let offsetY = 0;
    export let scale = 1;
    export let targetNodeIndex: NodeIndex = 0;
    export let lockedNodeIndex: NodeIndex = 12;
    export let emptySpaceWorldX = 180;
    export let emptySpaceWorldY = 342;

    const SPOTLIGHT_PAD = 12;
    const ROOT_SPOTLIGHT_PAD = 10;
    const HUD_SPOTLIGHT_RADIUS = 18;
    const EMPTY_RECT: Rect = { top: 0, bottom: 0, left: 0, right: 0 };

    let overlayEl: HTMLDivElement | null = null;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let panePadding = 0;
    let bottomPadding = 0;
    let footerBottomOffset = 0;
    let footerHeight = 0;
    let footerBounds: Rect = { ...EMPTY_RECT };
    let isTouch = false;
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    let currentStepIndex = 0;
    let dismissing = false;
    let layoutVersion = 0;
    let layoutRefreshFrame: number | null = null;
    let trailingLayoutRefreshFrame: number | null = null;
    let treeViewportRect: Rect = { ...EMPTY_RECT };
    let nodeSpotlightRect: Rect = { ...EMPTY_RECT };
    let lockedNodeSpotlightRect: Rect = { ...EMPTY_RECT };
    let rootSpotlightRect: Rect = { ...EMPTY_RECT };
    let treeSpotlightRect: Rect = { ...EMPTY_RECT };
    let hudSpotlightRect: Rect = { ...EMPTY_RECT };
    let previewSpotlightRect: Rect = { ...EMPTY_RECT };
    let toolbarSpotlightRect: Rect = { ...EMPTY_RECT };
    let toolbarShift = 0;
    let bottombarSpotlightRect: Rect = { ...EMPTY_RECT };

    $: targetNode = nodes[targetNodeIndex];
    $: targetRegion = (() => {
        if (!targetNode) return "bottom-left" as const;
        if (targetNode.x > TREE_ROOT_X) return "right" as const;
        if (targetNode.y < TREE_ROOT_Y) return "top-left" as const;
        return "bottom-left" as const;
    })();

    $: lockedNode = nodes[lockedNodeIndex];
    $: lockedNodeRegion = (() => {
        if (!lockedNode) return "bottom-left" as const;
        if (lockedNode.x > TREE_ROOT_X) return "right" as const;
        if (lockedNode.y < TREE_ROOT_Y) return "top-left" as const;
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
        lockedNodeRegion,
    });
    $: if (steps.length === 0) {
        currentStepIndex = 0;
    } else if (currentStepIndex > steps.length - 1) {
        currentStepIndex = steps.length - 1;
    }
    $: activeStep = steps[currentStepIndex] ?? null;
    $: actionHint = isTouch
        ? $t("onboarding.continueTap")
        : $t("onboarding.continueClick");
    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepTransitionDuration = prefersReducedMotion ? 0 : 220;
    const stepTransitionY = prefersReducedMotion ? 0 : 16;

    $: nodeRadius = (targetNode?.radius ?? 1) * NODE_RADIUS_PX;
    $: nodeScreenX = (targetNode?.x ?? 0) * scale + offsetX;
    $: nodeScreenY = (targetNode?.y ?? 0) * scale + offsetY;
    $: nodeScreenRadius = nodeRadius * scale;

    $: lockedNodeRadius = (lockedNode?.radius ?? 1) * NODE_RADIUS_PX;
    $: lockedNodeScreenX = (lockedNode?.x ?? 0) * scale + offsetX;
    $: lockedNodeScreenY = (lockedNode?.y ?? 0) * scale + offsetY;
    $: lockedNodeScreenRadius = lockedNodeRadius * scale;

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

    function scheduleLayoutRefresh() {
        if (typeof window === "undefined") return;
        if (layoutRefreshFrame !== null) {
            cancelAnimationFrame(layoutRefreshFrame);
        }
        if (trailingLayoutRefreshFrame !== null) {
            cancelAnimationFrame(trailingLayoutRefreshFrame);
        }
        layoutRefreshFrame = requestAnimationFrame(() => {
            layoutVersion += 1;
            layoutRefreshFrame = null;
            trailingLayoutRefreshFrame = requestAnimationFrame(() => {
                layoutVersion += 1;
                trailingLayoutRefreshFrame = null;
            });
        });
    }

    $: if (overlayEl) {
        currentStepIndex;
        targetNodeIndex;
        lockedNodeIndex;
        viewportWidth;
        viewportHeight;
        offsetX;
        offsetY;
        scale;
        nodes;
        scheduleLayoutRefresh();
    }

    $: {
        void layoutVersion;
        treeViewportRect =
            resolveElementRect(".tree-viewport", 0, 0) ?? { ...EMPTY_RECT };

        nodeSpotlightRect =
            resolveElementRect(`[data-node-id="${targetNodeIndex}"]`, SPOTLIGHT_PAD) ??
            circleRect(
                treeViewportRect.left + nodeScreenX,
                treeViewportRect.top + nodeScreenY,
                nodeScreenRadius + SPOTLIGHT_PAD,
            );

        lockedNodeSpotlightRect =
            resolveElementRect(`[data-node-id="${lockedNodeIndex}"]`, SPOTLIGHT_PAD) ??
            circleRect(
                treeViewportRect.left + lockedNodeScreenX,
                treeViewportRect.top + lockedNodeScreenY,
                lockedNodeScreenRadius + SPOTLIGHT_PAD,
            );

        rootSpotlightRect =
            resolveElementRect('[data-node-id="root"]', ROOT_SPOTLIGHT_PAD) ??
            circleRect(
                treeViewportRect.left + rootScreenX,
                treeViewportRect.top + rootScreenY,
                rootFallbackRadius,
            );

        treeSpotlightRect = circleRect(
            treeViewportRect.left + treeScreenX,
            treeViewportRect.top + treeScreenY,
            treeSpotlightRadius,
        );

        hudSpotlightRect =
            resolveElementRect(".top-right-actions", 8, 8) ?? fallbackHudRect();

        previewSpotlightRect =
            resolveElementRect(".preview-indicator-button", 8) ?? { ...EMPTY_RECT };

        toolbarSpotlightRect =
            resolveElementRect(".bot-right-actions", 8, 8) ?? { ...EMPTY_RECT };

        bottombarSpotlightRect =
            resolveElementRect(".tabs-bar-spacer", 8) ?? { ...EMPTY_RECT };
    }

    $: activeSpotlightRect = (() => {
        if (!activeStep) return EMPTY_RECT;
        if (activeStep.target === "node") return nodeSpotlightRect;
        if (activeStep.target === "locked-node") return lockedNodeSpotlightRect;
        if (activeStep.target === "hud") return hudSpotlightRect;
        if (activeStep.target === "root") return rootSpotlightRect;
        if (activeStep.target === "toolbar") return toolbarSpotlightRect;
        if (activeStep.target === "preview") return previewSpotlightRect;
        if (activeStep.target === "bottombar") return bottombarSpotlightRect;
        return treeSpotlightRect;
    })();
    $: {
        if (typeof document !== "undefined") {
            const target = activeStep?.target;
            document.body.classList.toggle(
                "onboarding-step-hud",
                target === "hud",
            );
            document.body.classList.toggle(
                "onboarding-step-preview",
                target === "preview",
            );
            document.body.classList.toggle(
                "onboarding-step-toolbar",
                target === "toolbar",
            );
            document.body.classList.toggle(
                "onboarding-step-bottombar",
                target === "bottombar",
            );
        }
    }
    $: activeSpotlightIsRect =
        activeStep?.target === "hud" ||
        activeStep?.target === "toolbar" ||
        activeStep?.target === "preview" ||
        activeStep?.target === "bottombar";
    $: ringTop = Math.max(0, activeSpotlightRect.top);
    $: ringLeft = Math.max(0, activeSpotlightRect.left);
    $: ringRight = Math.min(viewportWidth, activeSpotlightRect.right);
    $: ringBottom = Math.min(viewportHeight, activeSpotlightRect.bottom);
    $: ringWidth = ringRight - ringLeft;
    $: ringHeight = ringBottom - ringTop;

    $: footerReservedSpace = Math.max(
        bottomPadding,
        footerHeight + bottomPadding + panePadding,
    );
    $: {
        void layoutVersion;
        const footerTop = viewportHeight - bottomPadding - footerHeight;
        footerBounds = {
            top: footerTop - panePadding,
            bottom: viewportHeight,
            left: 0,
            right: viewportWidth,
        };
    }

    $: {
        void layoutVersion;
        const botActions = document.querySelector<HTMLElement>(".bot-right-actions");
        const footerNote = overlayEl?.querySelector<HTMLElement>(".footer-note");
        if (botActions && footerNote && toolbarSpotlightRect.bottom > 0) {
            const overlayRect = overlayEl!.getBoundingClientRect();
            const footerRect = footerNote.getBoundingClientRect();
            const fRect: Rect = {
                top: footerRect.top - overlayRect.top,
                bottom: footerRect.bottom - overlayRect.top,
                left: footerRect.left - overlayRect.left,
                right: footerRect.right - overlayRect.left,
            };
            const naturalRect: Rect = {
                top: toolbarSpotlightRect.top + toolbarShift,
                bottom: toolbarSpotlightRect.bottom + toolbarShift,
                left: toolbarSpotlightRect.left,
                right: toolbarSpotlightRect.right,
            };
            const overlap = overlapArea(naturalRect, fRect);
            if (overlap > 0) {
                const shift = naturalRect.bottom - fRect.top + 8;
                toolbarShift = shift;
                botActions.style.transform = `translateY(-${shift}px)`;
            } else {
                toolbarShift = 0;
                botActions.style.transform = "";
            }
        } else if (botActions) {
            toolbarShift = 0;
            botActions.style.transform = "";
        }
    }

    function handleAdvance() {
        if (dismissing || !activeStep) return;
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex += 1;
            void tick().then(() => {
                overlayEl?.focus();
                scheduleLayoutRefresh();
            });
            return;
        }
        dismissOnboarding();
    }

    function handleBack() {
        if (dismissing || currentStepIndex <= 0) return;
        currentStepIndex -= 1;
        void tick().then(() => {
            overlayEl?.focus();
            scheduleLayoutRefresh();
        });
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

    function handleAdvanceClick(event: MouseEvent) {
        blockEvent(event);
        if (dismissing) return;
        handleAdvance();
    }

    function handleKeydown(event: KeyboardEvent) {
        blockEvent(event);
        if (dismissing) return;
        if (event.key === "Enter" || event.key === " ") {
            handleAdvance();
        }
    }

    onMount(() => {
        toastsPaused.set(true);
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

        document.body.classList.add("has-onboarding-overlay");
        window.addEventListener("keydown", handleKeydown, true);
        scheduleLayoutRefresh();
        void tick().then(() => {
            overlayEl?.focus();
            scheduleLayoutRefresh();
        });

        return () => {
            toastsPaused.set(false);
            document.body.classList.remove(
                "has-onboarding-overlay",
                "onboarding-step-hud",
                "onboarding-step-toolbar",
                "onboarding-step-preview",
                "onboarding-step-bottombar",
            );
            const botActions = document.querySelector<HTMLElement>(".bot-right-actions");
            if (botActions) botActions.style.transform = "";
            window.removeEventListener("keydown", handleKeydown, true);
            if (dismissTimer) clearTimeout(dismissTimer);
            if (layoutRefreshFrame !== null) {
                cancelAnimationFrame(layoutRefreshFrame);
            }
            if (trailingLayoutRefreshFrame !== null) {
                cancelAnimationFrame(trailingLayoutRefreshFrame);
            }
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
    on:click={handleAdvanceClick}
    on:keydown={handleKeydown}
    on:contextmenu={blockEvent}
    on:wheel={blockEvent}
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
        style="left: {ringLeft}px; top: {ringTop}px; width: {ringWidth}px; height: {ringHeight}px; border-radius: {activeSpotlightIsRect
            ? HUD_SPOTLIGHT_RADIUS
            : 999}px;"
    ></div>

    {#if activeStep}
        {#key activeStep.id}
            <div
                class="onboarding-pane-wrap"
                in:fly={{ y: stepTransitionY, duration: stepTransitionDuration }}
                out:fly={{ y: -stepTransitionY, duration: stepTransitionDuration }}
            >
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
                    avoidRects={footerBounds.top > 0 ? [footerBounds] : []}
                    ownSpotlightRect={activeSpotlightRect}
                    edgePadding={effectivePanePadding}
                    bottomEdgePadding={footerReservedSpace}
                    compact={compactLayout}
                />
            </div>
        {/key}
    {/if}

    <div
        class="footer-wrap"
        bind:clientHeight={footerHeight}
        style="bottom: {bottomPadding}px;"
    >
        <OnboardingFooterNote
            stepNumber={currentStepIndex + 1}
            stepCount={steps.length}
            title={$t("onboarding.tutorialTitle")}
            hintText={actionHint}
            compact={compactLayout}
            onSkip={dismissOnboarding}
            onBack={handleBack}
            onForward={handleAdvance}
        />
    </div>
</div>

<style>
    .onboarding-overlay {
        position: absolute;
        inset: 0;
        z-index: calc(var(--z-index-modal) - 1);
        pointer-events: auto;
        touch-action: none;
        overflow: hidden;
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

    .onboarding-pane-wrap {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    .onboarding-pane-wrap :global(*) {
        pointer-events: auto;
    }

    .footer-wrap {
        position: absolute;
        left: max(var(--bar-pad), var(--safe-left, 0px));
        right: max(var(--bar-pad), var(--safe-right, 0px));
        display: flex;
        justify-content: center;
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
