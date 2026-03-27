<script context="module" lang="ts">
    import type { Component as FabMenuComponent } from "svelte";

    export type FabMenuAction = {
        id: string;
        icon: FabMenuComponent;
        label: string;
        onClick: () => void | Promise<void>;
        ariaLabel?: string;
        disabled?: boolean;
    };
</script>

<script lang="ts">
    import type { Component } from "svelte";
    import { triggerHaptic } from "./hapticsStore";
    import { isKeyboardAction } from "./input";
    type FabMenuAction = {
        id: string;
        icon: Component;
        label: string;
        onClick: () => void | Promise<void>;
        ariaLabel?: string;
        disabled?: boolean;
    };

    export let actions: FabMenuAction[] = [];
    export let ariaLabel = "Floating action menu";
    export let iconSize = 24;
    export let fabIcon: Component | null = null;

    let isOpen = false;

    function toggle() {
        triggerHaptic();
        isOpen = !isOpen;
    }

    function close() {
        isOpen = false;
    }

    async function handleActionClick(action: FabMenuAction): Promise<void> {
        if (action.disabled) return;
        triggerHaptic();
        close();
        await action.onClick();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (isKeyboardAction(event, "dismiss") && isOpen) {
            event.stopPropagation();
            close();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="fab-menu" class:fab-menu--open={isOpen}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="fab-menu__scrim"
        on:click={() => { triggerHaptic(); close(); }}
        role="presentation"
        aria-hidden="true"
    ></div>

    <div
        class="fab-menu__items"
        role="toolbar"
        aria-label={ariaLabel}
        aria-hidden={!isOpen}
    >
        {#each actions as action, i (action.id)}
            <button
                type="button"
                class="fab-menu__action"
                style="--enter-delay: {(actions.length - 1 - i) * 30}ms; --exit-delay: {i * 20}ms"
                aria-label={action.ariaLabel ?? action.label}
                disabled={action.disabled}
                tabindex={isOpen ? 0 : -1}
                on:click={() => handleActionClick(action)}
            >
                <span class="fab-menu__label">{action.label}</span>
                <span class="fab-menu__icon" aria-hidden="true">
                    <svelte:component this={action.icon} size={iconSize} />
                </span>
            </button>
        {/each}
    </div>

    <button
        type="button"
        class="fab-menu__trigger"
        aria-label={isOpen ? "Close menu" : ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="true"
        on:click={toggle}
    >
        {#if fabIcon}
            <span class="fab-menu__trigger-icon fab-menu__trigger-icon--custom" aria-hidden="true">
                <svelte:component this={fabIcon} size={iconSize} />
            </span>
        {/if}
        <span class="fab-menu__trigger-icon fab-menu__trigger-icon--cross" aria-hidden="true">
            <span class="fab-menu__trigger-bar"></span>
            <span class="fab-menu__trigger-bar"></span>
        </span>
    </button>
</div>

<style>
    .fab-menu {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--spacing-md);
    }

    /* ── Scrim ── */
    .fab-menu__scrim {
        position: fixed;
        inset: 0;
        background: color-mix(in srgb, var(--bg) 50%, transparent);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--ease-standard);
    }

    .fab-menu--open .fab-menu__scrim {
        opacity: 1;
        pointer-events: auto;
    }

    /* ── Items container ── */
    .fab-menu__items {
        display: grid;
        grid-template-columns: max-content;
        justify-content: end;
        gap: var(--spacing-md);
        position: relative;
        z-index: 1;
    }

    /* ── Action buttons ── */
    .fab-menu__action {
        min-height: 38px;
        border-radius: var(--radius);
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 36%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent) 20%, var(--bg-raised)) !important;
        color: var(--text);
        box-shadow: var(--shadow-node, var(--shadow));
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) var(--spacing-lg);
        font-size: var(--font-base);
        letter-spacing: var(--tracking);
        text-transform: none;
        cursor: pointer;

        /* Hidden by default — revealed when menu opens */
        opacity: 0;
        transform: translateY(8px) scale(0.92);
        pointer-events: none;

        transition:
            opacity 0.2s cubic-bezier(0.2, 0, 0, 1) var(--exit-delay),
            transform 0.2s cubic-bezier(0.2, 0, 0, 1) var(--exit-delay),
            filter var(--ease),
            background var(--ease),
            border-color var(--ease);
    }

    .fab-menu--open .fab-menu__action {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
        transition:
            opacity 0.2s cubic-bezier(0.2, 0, 0, 1) var(--enter-delay),
            transform 0.2s cubic-bezier(0.2, 0, 0, 1) var(--enter-delay),
            filter var(--ease),
            background var(--ease),
            border-color var(--ease);
    }

    .fab-menu--open .fab-menu__action:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
    }

    .fab-menu__icon {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
    }

    .fab-menu__label {
        line-height: 1;
        font-weight: 600;
        white-space: nowrap;
    }

    .fab-menu__action:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .fab-menu__action:hover:not(:disabled) {
            filter: var(--brightness-hover);
        }
    }

    .fab-menu--open .fab-menu__action:active:not(:disabled) {
        transform: scale(0.97);
        filter: var(--brightness-hover);
    }

    /* ── Trigger FAB ── */
    .fab-menu__trigger {
        position: relative;
        z-index: 1;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 36%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent) 25%, var(--bg-raised)) !important;
        color: var(--text);
        box-shadow: var(--shadow-node, var(--shadow));
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            transform var(--ease),
            filter var(--ease),
            background var(--ease),
            border-color var(--ease);
    }

    .fab-menu__trigger:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .fab-menu__trigger:hover {
            filter: var(--brightness-hover);
        }
    }

    .fab-menu__trigger:active {
        transform: scale(0.94);
        filter: var(--brightness-hover);
    }

    /* ── Trigger icon: + → × morph ── */
    .fab-menu__trigger-icon--cross {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        position: relative;
    }

    .fab-menu__trigger-bar {
        position: absolute;
        width: 18px;
        height: 2px;
        background: currentColor;
        border-radius: 1px;
        transition: transform var(--ease-emphasis);
    }

    .fab-menu__trigger-bar:first-child {
        transform: rotate(0deg);
    }

    .fab-menu__trigger-bar:last-child {
        transform: rotate(90deg);
    }

    .fab-menu--open .fab-menu__trigger-bar:first-child {
        transform: rotate(45deg);
    }

    .fab-menu--open .fab-menu__trigger-bar:last-child {
        transform: rotate(-45deg);
    }

    /* ── Custom icon (optional fabIcon prop) ── */
    .fab-menu__trigger-icon--custom {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            opacity var(--ease-accel),
            transform var(--ease-emphasis);
    }

    .fab-menu--open .fab-menu__trigger-icon--custom {
        opacity: 0;
        transform: rotate(90deg) scale(0.5);
    }

    /* When custom icon is present, hide cross bars when closed */
    .fab-menu__trigger-icon--custom + .fab-menu__trigger-icon--cross {
        opacity: 0;
        transition: opacity var(--ease-accel);
    }

    .fab-menu--open .fab-menu__trigger-icon--custom + .fab-menu__trigger-icon--cross {
        opacity: 1;
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
        .fab-menu__action,
        .fab-menu__scrim,
        .fab-menu__trigger-bar,
        .fab-menu__trigger-icon--custom,
        .fab-menu__trigger-icon--cross {
            transition-duration: 0.01ms !important;
            transition-delay: 0ms !important;
        }
    }
</style>
