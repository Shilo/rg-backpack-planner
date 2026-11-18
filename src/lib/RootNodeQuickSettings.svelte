<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { RootNodeIcon } from "./customIcons";
    import {
        ArrowCounterClockwiseIcon,
        CaretUpIcon,
        GraphIcon,
    } from "phosphor-svelte";
    import {
        nodePrimaryAction,
        NodePrimaryAction,
    } from "./nodePrimaryActionStore";
    import {
        nodeLevelBehavior,
        NodeLevelBehavior,
    } from "./nodeLevelBehaviorStore";
    import {
        sumLevels,
        sumTreeBranchLevels,
        type TreeBranchKey,
    } from "./treeLevelsStore";
    import type { LevelsByIndex } from "../types/tree";
    import { triggerHaptic } from "./hapticsStore";
    import { showToast } from "./toast";
    import { t } from "svelte-whisper";
    import {
        getInputLabel,
        getKeyboardActionLabel,
        isKeyboardAction,
        touchPrimary,
    } from "./input";
    import InputChip from "./InputChip.svelte";

    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    export let treeLabel = "";
    export let activeLevels: LevelsByIndex | null = null;
    export let onResetBranch: ((branch: TreeBranchKey) => void) | null = null;
    export let onResetTree: (() => void) | null = null;

    let panelEl: HTMLDivElement | null = null;
    let displayX = 0;
    let displayY = 0;
    let wasOpen = false;
    let backdropHadPointerDown = false;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let dragStart: {
        x: number;
        y: number;
        panelX: number;
        panelY: number;
    } | null = null;
    let pointerId: number | null = null;

    const DRAG_THRESHOLD = 5;

    function getHudMargins(): {
        top: number;
        right: number;
        bottom: number;
        left: number;
    } {
        const s = getComputedStyle(document.documentElement);
        const px = (key: string) => parseFloat(s.getPropertyValue(key)) || 0;
        const barPad = px("--spacing-lg") || 12;
        return {
            top: Math.max(barPad, px("--safe-top")),
            right: Math.max(barPad, px("--safe-right")),
            bottom: Math.max(barPad, px("--safe-bottom")),
            left: Math.max(barPad, px("--safe-left")),
        };
    }

    function getBasePosition() {
        if (!panelEl) return { x: 0, y: 0 };
        return {
            x: x - panelEl.offsetWidth / 2,
            y: y - panelEl.offsetHeight,
        };
    }

    $: clickActionLabel = $t("settings.nodePrimaryActionTitle", {
        primaryAction: getInputLabel(
            "primary",
            null,
            $touchPrimary ? "touch" : "mouse",
            $t,
        ),
    });
    $: keyCyclePrimaryAction = getKeyboardActionLabel("cyclePrimaryAction", $t);

    /** (x, y) from parent: x = center of root, y = desired bottom edge of panel (e.g. rootTop - padding). */
    function updatePosition() {
        if (!panelEl) return;
        // Use offsetWidth/Height instead of getBoundingClientRect — the entry
        // animation scales the panel to 0.96 and getBoundingClientRect reports
        // the rendered (scaled) size, causing position clamping to undercount.
        const w = panelEl.offsetWidth;
        const h = panelEl.offsetHeight;
        const m = getHudMargins();
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;
        let px = x - w / 2 + dragOffset.x;
        let py = y - h + dragOffset.y;
        px = Math.max(m.left, Math.min(px, vw - m.right - w));
        py = Math.max(m.top, Math.min(py, vh - m.bottom - h));
        displayX = px;
        displayY = py;
    }

    function showSettingToast(settingLabel: string, valueLabel: string) {
        showToast(`${settingLabel}: ${valueLabel}`);
    }

    $: if (isOpen && !wasOpen) {
        wasOpen = true;
        dragOffset = { x: 0, y: 0 };
        isDragging = false;
        dragStart = null;
        pointerId = null;
        tick().then(updatePosition);
    }

    $: if (!isOpen && wasOpen) {
        wasOpen = false;
        backdropHadPointerDown = false;
        dragOffset = { x: 0, y: 0 };
        isDragging = false;
        dragStart = null;
        pointerId = null;
    }

    function selectPrimaryAction(action: NodePrimaryAction) {
        nodePrimaryAction.set(action);
        triggerHaptic();
        const label =
            action === NodePrimaryAction.IncrementOne
                ? $t("nodeMenu.incrementOne")
                : action === NodePrimaryAction.IncrementTen
                  ? $t("nodeMenu.incrementTen")
                  : $t("nodeMenu.incrementTier");
        showSettingToast(clickActionLabel, label);
        onClose?.();
    }

    const BRANCHES: TreeBranchKey[] = ["orange", "blue", "yellow"];

    $: resetLabel = $t("tree.resetBranchToast", { branchName: treeLabel });

    function isBranchEmpty(branch: TreeBranchKey): boolean {
        return sumTreeBranchLevels(activeLevels, branch) === 0;
    }

    $: isTreeEmpty = sumLevels(activeLevels) === 0;

    function handleResetBranch(branch: TreeBranchKey) {
        if (isBranchEmpty(branch)) return;
        triggerHaptic();
        onResetBranch?.(branch);
        onClose?.();
    }

    function handleResetTree() {
        if (isTreeEmpty) return;
        triggerHaptic();
        onResetTree?.();
        onClose?.();
    }

    function selectLevelBehavior(behavior: NodeLevelBehavior) {
        nodeLevelBehavior.set(behavior);
        triggerHaptic();
        const label =
            behavior === NodeLevelBehavior.Solo
                ? $t("settings.nodeLevelBehaviorSolo")
                : $t("settings.nodeLevelBehaviorSync");
        showSettingToast($t("settings.nodeLevelBehavior"), label);
        onClose?.();
    }

    let escapeListenerCleanup: (() => void) | null = null;

    $: if (isOpen) {
        escapeListenerCleanup?.();
        const handler = (e: KeyboardEvent) => {
            if (isKeyboardAction(e, "dismiss")) {
                e.preventDefault();
                e.stopImmediatePropagation();
                onClose?.();
            }
        };
        window.addEventListener("keydown", handler, true);
        escapeListenerCleanup = () => {
            window.removeEventListener("keydown", handler, true);
            escapeListenerCleanup = null;
        };
    } else {
        escapeListenerCleanup?.();
        escapeListenerCleanup = null;
    }

    onDestroy(() => {
        escapeListenerCleanup?.();
    });

    function handleKeydown(event: KeyboardEvent) {
        if (isKeyboardAction(event, "dismiss")) {
            event.preventDefault();
            event.stopPropagation();
            onClose?.();
        }
    }

    function isInteractiveElement(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) return false;
        const tagName = target.tagName.toLowerCase();
        if (tagName === "button" || tagName === "a" || tagName === "input") {
            return true;
        }
        return (
            target.closest(
                'button, a, input, [role="button"], [role="radio"]',
            ) !== null
        );
    }

    function handlePointerDown(event: PointerEvent) {
        if (!panelEl) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        if (isInteractiveElement(event.target)) {
            event.stopPropagation();
            return;
        }

        event.stopPropagation();
        panelEl.setPointerCapture(event.pointerId);
        pointerId = event.pointerId;

        const rect = panelEl.getBoundingClientRect();
        dragStart = {
            x: event.clientX,
            y: event.clientY,
            panelX: rect.left,
            panelY: rect.top,
        };
        isDragging = false;
    }

    function handlePointerMove(event: PointerEvent) {
        if (!panelEl || !dragStart || pointerId !== event.pointerId) return;

        const dx = event.clientX - dragStart.x;
        const dy = event.clientY - dragStart.y;
        const distance = Math.hypot(dx, dy);

        if (!isDragging && distance > DRAG_THRESHOLD) {
            isDragging = true;
            event.preventDefault();
        }

        if (!isDragging) return;

        event.preventDefault();

        const basePosition = getBasePosition();
        dragOffset.x = dragStart.panelX + dx - basePosition.x;
        dragOffset.y = dragStart.panelY + dy - basePosition.y;
        updatePosition();
        dragOffset.x = displayX - basePosition.x;
        dragOffset.y = displayY - basePosition.y;
    }

    function handlePointerUp(event: PointerEvent) {
        if (!panelEl || pointerId !== event.pointerId) return;

        panelEl.releasePointerCapture(event.pointerId);
        isDragging = false;
        dragStart = null;
        pointerId = null;
    }

    function handleBackdropPointerDown(event: PointerEvent) {
        if (event.target !== event.currentTarget) return;
        event.stopPropagation();
        backdropHadPointerDown = true;
    }

    function handleBackdropPointerUp(event: PointerEvent) {
        if (event.target !== event.currentTarget) return;
        event.stopPropagation();
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        if (!backdropHadPointerDown) return;
        triggerHaptic();
        onClose?.();
    }

    function handleBackdropContextMenu(event: MouseEvent) {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        if (!backdropHadPointerDown) return;
        onClose?.();
    }
</script>

{#if isOpen}
    <button
        class="qs-backdrop backdrop"
        type="button"
        tabindex="0"
        aria-label={$t("common.close")}
        on:pointerdown={handleBackdropPointerDown}
        on:pointerup={handleBackdropPointerUp}
        on:click={handleBackdropClick}
        on:contextmenu={handleBackdropContextMenu}
    ></button>
    <div
        class="qs-panel"
        class:dragging={isDragging}
        bind:this={panelEl}
        role="dialog"
        tabindex="-1"
        aria-label="Quick settings"
        style="transform: translate({displayX}px, {displayY}px);"
        on:keydown={handleKeydown}
        on:pointerdown={handlePointerDown}
        on:pointermove={handlePointerMove}
        on:pointerup={handlePointerUp}
        on:pointercancel={handlePointerUp}
    >
        <div class="qs-header">
            <RootNodeIcon class="qs-header-icon" aria-hidden="true" />
            <span class="qs-header-title">{$t("quickSettings.title")}</span>
        </div>

        <div class="qs-reset-row">
            <span class="qs-reset-label">
                <ArrowCounterClockwiseIcon size={14} weight="bold" />
                {resetLabel}
            </span>
            <div class="qs-reset-chips">
                {#each BRANCHES as branch (branch)}
                    {@const empty = isBranchEmpty(branch)}
                    <button
                        class="qs-reset-chip qs-reset-chip--{branch}"
                        type="button"
                        disabled={empty}
                        on:click={() => handleResetBranch(branch)}
                    >
                        {$t(`theme.colorNames.${branch}`)}
                    </button>
                {/each}
                <span class="qs-reset-divider"></span>
                <button
                    class="qs-reset-chip qs-reset-chip--all"
                    type="button"
                    disabled={isTreeEmpty}
                    on:click={handleResetTree}
                >
                    {$t("modal.resetTree.choiceTreeLabel")}
                </button>
            </div>
        </div>

        <div class="qs-rows">
            <span class="qs-label">
                <GraphIcon size={14} weight="bold" />
                {$t("settings.nodeLevelBehavior")}
            </span>
            <div
                class="qs-chips"
                role="radiogroup"
                aria-label={$t("settings.nodeLevelBehavior")}
            >
                {#each [NodeLevelBehavior.Solo, NodeLevelBehavior.Sync] as behavior (behavior)}
                    <button
                        class="qs-chip"
                        class:qs-chip--active={$nodeLevelBehavior === behavior}
                        type="button"
                        role="radio"
                        aria-checked={$nodeLevelBehavior === behavior}
                        on:click={() => selectLevelBehavior(behavior)}
                    >
                        {behavior === NodeLevelBehavior.Solo
                            ? $t("settings.nodeLevelBehaviorSolo")
                            : $t("settings.nodeLevelBehaviorSync")}
                    </button>
                {/each}
            </div>

            <span class="qs-label">
                <CaretUpIcon size={14} weight="bold" />
                {clickActionLabel}
                <span class="qs-shortcut"
                    ><InputChip keys={keyCyclePrimaryAction} /></span
                >
            </span>
            <div
                class="qs-chips"
                role="radiogroup"
                aria-label={clickActionLabel}
            >
                {#each [NodePrimaryAction.IncrementOne, NodePrimaryAction.IncrementTen, NodePrimaryAction.IncrementTier] as action (action)}
                    <button
                        class="qs-chip"
                        class:qs-chip--active={$nodePrimaryAction === action}
                        type="button"
                        role="radio"
                        aria-checked={$nodePrimaryAction === action}
                        on:click={() => selectPrimaryAction(action)}
                    >
                        {action === NodePrimaryAction.IncrementOne
                            ? $t("nodeMenu.incrementOne")
                            : action === NodePrimaryAction.IncrementTen
                              ? $t("nodeMenu.incrementTen")
                              : $t("nodeMenu.incrementTier")}
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .qs-backdrop {
        position: fixed;
        inset: 0;
        background: transparent;
        border: none;
        padding: 0;
        z-index: var(--z-index-context-menu);
        cursor: default;
        -webkit-tap-highlight-color: transparent;
    }

    .qs-panel {
        position: fixed;
        left: 0;
        top: 0;
        z-index: calc(var(--z-index-context-menu) + 1);
        background: var(--bg-panel);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow), var(--shadow-lg);
        display: flex;
        flex-direction: column;
        width: max-content;
        max-width: calc(
            100vw - max(var(--spacing-lg), var(--safe-left)) -
                max(var(--spacing-lg), var(--safe-right))
        );
        overflow: hidden;
        animation: qs-enter 0.22s cubic-bezier(0.05, 0.7, 0.1, 1) both;
        user-select: none;
        cursor: move;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
    }

    .qs-panel.dragging {
        cursor: grabbing;
    }

    .qs-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) var(--spacing-md);
        border-bottom: var(--border-width) solid var(--border);
        background: color-mix(in srgb, var(--bg-input) 90%, var(--accent) 10%);
        color: color-mix(in srgb, var(--text-disabled) 70%, var(--accent) 30%);
        animation: qs-section-in 0.2s cubic-bezier(0.05, 0.7, 0.1, 1) 0.03s both;
    }

    .qs-header :global(.qs-header-icon) {
        flex: 0 0 auto;
        display: block;
        width: 16px;
        height: 16px;
        color: currentColor;
        --root-gear-fill: color-mix(in srgb, var(--surface) 80%, transparent);
        --root-gear-stroke: currentColor;
        --root-gear-stroke-width: 3;
    }

    .qs-header-title {
        font-size: var(--font-sm);
        letter-spacing: var(--tracking);
        white-space: nowrap;
        line-height: var(--leading);
    }

    .qs-rows {
        display: grid;
        grid-template-columns: max-content 1fr;
        padding: var(--spacing-xs) 0 var(--spacing-sm) 0;
        animation: qs-section-in 0.2s cubic-bezier(0.05, 0.7, 0.1, 1) 0.08s both;
    }

    .qs-label {
        font-size: var(--font-xs);
        color: var(--text-disabled);
        letter-spacing: var(--tracking);
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        min-height: 44px;
        line-height: var(--leading);
    }

    .qs-shortcut {
        margin-left: auto;
        flex: 0 0 auto;
        font-size: var(--font-xs);
    }

    .qs-chips {
        display: flex;
        align-items: stretch;
        gap: 0;
        padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm)
            var(--spacing-sm);
        min-height: 44px;
    }

    /* Divider between setting rows */
    .qs-label:nth-child(n + 3),
    .qs-chips:nth-child(n + 4) {
        border-top: var(--border-width) solid
            color-mix(in srgb, var(--border) 60%, transparent);
    }

    /* ── Reset row ── */
    .qs-reset-row {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--danger-bg);
        border-bottom: var(--border-width) solid
            color-mix(in srgb, var(--danger-border) 50%, var(--border));
        animation: qs-section-in 0.2s cubic-bezier(0.05, 0.7, 0.1, 1) 0.05s both;
    }

    .qs-reset-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-size: var(--font-xs);
        color: var(--danger-text);
        letter-spacing: var(--tracking);
        white-space: nowrap;
        line-height: var(--leading);
    }

    .qs-reset-chips {
        display: flex;
        gap: var(--spacing-xs);
    }

    .qs-reset-divider {
        width: var(--border-width);
        align-self: stretch;
        margin: var(--spacing-xs) var(--spacing-xs);
        background: color-mix(in srgb, var(--danger-border) 50%, var(--border));
    }

    .qs-reset-chip {
        flex: 1;
        min-height: 32px;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-full);
        font-size: var(--font-sm);
        font-family: inherit;
        cursor: pointer;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            background var(--ease),
            color var(--ease),
            border-color var(--ease),
            opacity var(--ease),
            scale var(--ease);
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        --chip-accent: var(--danger-text);
        border: var(--border-width) solid
            color-mix(in srgb, var(--chip-accent) 35%, var(--border));
        background: color-mix(
            in srgb,
            var(--surface) 82%,
            var(--chip-accent) 18%
        );
        color: var(--text-muted);
    }

    .qs-reset-chip--orange {
        --chip-accent: var(--region-orange-accent);
    }

    .qs-reset-chip--blue {
        --chip-accent: var(--region-blue-accent);
    }

    .qs-reset-chip--yellow {
        --chip-accent: var(--region-yellow-accent);
    }

    .qs-reset-chip--all {
        --chip-accent: var(--danger-text);
    }

    .qs-reset-chip:disabled {
        --chip-accent: var(--text-disabled);
        opacity: var(--opacity-disabled);
        cursor: default;
        pointer-events: none;
        color: var(--text-disabled);
        background: color-mix(in srgb, var(--surface) 92%, var(--bg-input) 8%);
        border-color: var(--border);
    }

    .qs-reset-chip:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .qs-reset-chip:active:not(:disabled) {
        scale: 0.95;
    }

    @media (hover: hover) {
        .qs-reset-chip:not(:disabled):hover {
            background: color-mix(
                in srgb,
                var(--surface) 65%,
                var(--chip-accent) 35%
            );
        }
    }

    /* ── Segmented buttons ── */
    .qs-chip {
        flex: 1;
        min-height: 32px;
        padding: var(--spacing-xs) var(--spacing-sm);
        border: var(--border-width) solid var(--border);
        border-right-width: 0;
        border-radius: 0;
        background: transparent;
        color: var(--text-muted);
        font-size: var(--font-sm);
        font-family: inherit;
        cursor: pointer;
        transition:
            background var(--ease),
            color var(--ease),
            border-color var(--ease),
            scale var(--ease);
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .qs-chip:first-child {
        border-radius: var(--radius-full) 0 0 var(--radius-full);
    }

    .qs-chip:last-child {
        border-right-width: var(--border-width);
        border-radius: 0 var(--radius-full) var(--radius-full) 0;
    }

    .qs-chip:only-child {
        border-right-width: var(--border-width);
        border-radius: var(--radius-full);
    }

    .qs-chip:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
        z-index: 1;
    }

    @media (hover: hover) {
        .qs-chip:not(.qs-chip--active):hover {
            background: color-mix(
                in srgb,
                var(--bg-raised) 80%,
                var(--text) 20%
            );
            color: var(--text);
        }
    }

    .qs-chip:active {
        scale: 0.97;
    }

    .qs-chip--active {
        background: color-mix(in srgb, var(--surface) 78%, var(--accent));
        color: var(--text);
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    }

    .qs-chip--active + .qs-chip {
        border-left-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    }

    /* ── Animations ── */
    @keyframes qs-enter {
        from {
            opacity: 0;
            scale: 0.96;
        }
        to {
            opacity: 1;
            scale: 1;
        }
    }

    @keyframes qs-section-in {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .qs-panel,
        .qs-header,
        .qs-reset-row,
        .qs-rows {
            animation: none;
        }
        .qs-chip,
        .qs-reset-chip {
            transition-duration: 0.01ms;
        }
    }
</style>
