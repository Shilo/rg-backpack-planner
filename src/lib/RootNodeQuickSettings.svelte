<script lang="ts">
    import { onMount, tick } from "svelte";
    import { RootNodeIcon } from "./customIcons";
    import { nodePrimaryAction, NodePrimaryAction } from "./nodePrimaryActionStore";
    import { nodeLevelBehavior, NodeLevelBehavior } from "./nodeLevelBehaviorStore";
    import { triggerHaptic } from "./hapticsStore";
    import { showToast } from "./toast";
    import { t } from "svelte-whisper";

    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;

    let panelEl: HTMLDivElement | null = null;
    let displayX = 0;
    let displayY = 0;
    let isTouchPlatform = false;
    let wasOpen = false;

    const MARGIN = 8;
    const OFFSET_Y = 12;

    onMount(() => {
        const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
        const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        isTouchPlatform = !hasFinePointer && (hasCoarsePointer || navigator.maxTouchPoints > 0);
    });

    $: clickActionLabel = $t("settings.nodePrimaryActionTitle", {
        primaryAction: $t(
            isTouchPlatform
                ? "settings.nodePrimaryActionTouch"
                : "settings.nodePrimaryActionLeftClick",
        ),
    });

    function updatePosition() {
        if (!panelEl) return;
        const rect = panelEl.getBoundingClientRect();
        let px = x - rect.width / 2;
        let py = y - rect.height - OFFSET_Y;
        px = Math.max(MARGIN, Math.min(px, window.innerWidth - rect.width - MARGIN));
        py = Math.max(MARGIN, Math.min(py, window.innerHeight - rect.height - MARGIN));
        displayX = px;
        displayY = py;
    }

    $: if (isOpen && !wasOpen) {
        wasOpen = true;
        tick().then(updatePosition);
    }

    $: if (!isOpen && wasOpen) {
        wasOpen = false;
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
        showToast(label);
        onClose?.();
    }

    function selectLevelBehavior(behavior: NodeLevelBehavior) {
        nodeLevelBehavior.set(behavior);
        triggerHaptic();
        const label =
            behavior === NodeLevelBehavior.Solo
                ? $t("settings.nodeLevelBehaviorSolo")
                : $t("settings.nodeLevelBehaviorSync");
        showToast(label);
        onClose?.();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose?.();
        }
    }
</script>

{#if isOpen}
    <button
        class="qs-backdrop"
        type="button"
        tabindex="-1"
        aria-hidden="true"
        on:click={() => onClose?.()}
        on:contextmenu|preventDefault={() => onClose?.()}
    ></button>
    <div
        class="qs-panel"
        bind:this={panelEl}
        role="dialog"
        tabindex="-1"
        aria-label={$t("quickSettings.ariaLabel")}
        style="transform: translate({displayX}px, {displayY}px);"
        on:keydown={handleKeydown}
    >
        <div class="qs-header">
            <RootNodeIcon class="qs-header-icon" aria-hidden="true" />
            <span class="qs-header-title">{$t("quickSettings.title")}</span>
        </div>

        <div class="qs-rows">
            <span class="qs-label">{clickActionLabel}</span>
            <div class="qs-chips" role="radiogroup" aria-label={clickActionLabel}>
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

            <span class="qs-label">{$t("settings.nodeLevelBehavior")}</span>
            <div class="qs-chips" role="radiogroup" aria-label={$t("settings.nodeLevelBehavior")}>
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
        max-width: calc(100vw - 16px);
        overflow: hidden;
        animation: qs-enter 0.15s cubic-bezier(0.05, 0.7, 0.1, 1) both;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
    }

    .qs-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md) var(--spacing-md);
        border-bottom: var(--border-width) solid var(--border);
        background: var(--bg-input);
        color: var(--text-disabled);
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
    }

    .qs-label {
        font-size: var(--font-xs);
        color: var(--text-disabled);
        letter-spacing: var(--tracking);
        white-space: nowrap;
        display: flex;
        align-items: center;
        padding: var(--spacing-sm) var(--spacing-md);
        min-height: 44px;
        line-height: var(--leading);
    }

    .qs-chips {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) 0;
        min-height: 44px;
    }

    /* Divider between rows */
    .qs-label:nth-child(3),
    .qs-chips:nth-child(4) {
        border-top: var(--border-width) solid color-mix(in srgb, var(--border) 60%, transparent);
    }

    .qs-chip {
        flex: 1;
        min-height: 32px;
        padding: var(--spacing-xs) var(--spacing-sm);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius-sm);
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

    .qs-chip:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .qs-chip:not(.qs-chip--active):hover {
            background: color-mix(in srgb, var(--bg-raised) 80%, var(--text) 20%);
            color: var(--text);
        }
    }

    .qs-chip:active {
        scale: 0.95;
    }

    .qs-chip--active {
        background: color-mix(in srgb, var(--surface) 78%, var(--accent));
        color: var(--text);
        border-color: color-mix(in srgb, var(--border) 60%, var(--accent));
    }

    @keyframes qs-enter {
        from {
            opacity: 0;
            scale: 0.92;
        }
        to {
            opacity: 1;
            scale: 1;
        }
    }
</style>
