<script lang="ts">
    import type { Component } from "svelte";
    import { createEventDispatcher } from "svelte";
    import { showToast } from "./toast";
    import { tooltip } from "./tooltip";
    import { triggerHaptic } from "./haptics";

    export let icon: Component | null = null;
    export let iconClass = "button-icon";
    export let iconAriaHidden = true;
    export let iconSize: number | string | undefined = 26;
    export let iconWeight:
        | "thin"
        | "light"
        | "regular"
        | "bold"
        | "fill"
        | "duotone"
        | undefined = undefined;
    export let type: "button" | "submit" | "reset" = "button";
    export let small = false;
    export let negative = false;
    export let positive = false;
    export let accent = false;
    export let disabled: boolean | undefined = undefined;
    export let tooltipText: string | undefined = undefined;
    export let element: HTMLButtonElement | null = null;
    export let toastMessage: string | undefined = undefined;
    export let toastNegative = false;
    export let toastDurationMs: number | undefined = undefined;

    let restClass: string | undefined;
    let buttonProps: Record<string, unknown> = {};

    $: ({ class: restClass, ...buttonProps } = $$restProps);
    $: computedClass = [
        "button",
        small ? "button-sm" : "button-md",
        negative ? "button-negative" : positive ? "button-positive" : accent ? "button-accent" : "",
        restClass,
        icon ? "with-icon" : "",
    ]
        .filter(Boolean)
        .join(" ");

    const dispatch = createEventDispatcher<{
        click: MouseEvent;
        contextmenu: MouseEvent;
        pointerdown: PointerEvent;
        pointermove: PointerEvent;
        pointerup: PointerEvent;
        pointercancel: PointerEvent;
        pointerleave: PointerEvent;
    }>();

    const forward = (event: Event) => {
        dispatch(
            event.type as
                | "click"
                | "contextmenu"
                | "pointerdown"
                | "pointermove"
                | "pointerup"
                | "pointercancel"
                | "pointerleave",
            event as never,
        );
    };

    const handleClick = (event: MouseEvent) => {
        forward(event);
        if (toastMessage) {
            showToast(toastMessage, {
                tone: toastNegative ? "negative" : "positive",
                durationMs: toastDurationMs,
            });
        }
    };

    const handlePointerDown = (event: PointerEvent) => {
        triggerHaptic();
        forward(event);
    };
</script>

<button
    {type}
    class={computedClass}
    bind:this={element}
    {disabled}
    use:tooltip={tooltipText}
    on:click={handleClick}
    on:contextmenu={forward}
    on:pointerdown={handlePointerDown}
    on:pointermove={forward}
    on:pointerup={forward}
    on:pointercancel={forward}
    on:pointerleave={forward}
    {...buttonProps}
>
    {#if icon}
        <svelte:component
            this={icon}
            class={iconClass}
            aria-hidden={iconAriaHidden}
            size={iconSize}
            weight={iconWeight}
        />
    {/if}
    <span class="button-text">
        <slot />
    </span>
</button>

<style>
    .button {
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        color: var(--text-muted);
        border-radius: var(--radius);
        text-align: left;
        line-height: var(--leading-none);
        transition:
            border-color var(--ease),
            color var(--ease),
            background var(--ease);
    }

    .button:not(:disabled) {
        cursor: pointer;
    }

    .button.with-icon {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
    }

    .button:has(.button-text:empty) {
        padding: 0;
        justify-content: center;
        gap: 0;
        text-align: center;
    }

    .button-text {
        line-height: var(--leading);
    }

    .button-icon {
        width: 16px;
        height: 16px;
        flex: 0 0 auto;
    }

    .button:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
        border-color: var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-disabled);
        filter: none;
        transform: none;
    }

    .button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .button {
        transition:
            transform var(--ease),
            filter var(--ease);
    }

    @media (hover: hover) {
        .button:not(:disabled):hover {
            filter: var(--brightness-hover);
        }
    }

    .button:not(:disabled):active {
        filter: var(--brightness-hover);
    }

    .button-sm {
        height: 32px;
        min-width: 32px;
        font-size: var(--font-sm);
    }

    .button-md {
        min-height: 38px;
        min-width: 38px;
        padding: var(--spacing-sm) var(--spacing-lg);
        font-size: var(--font-base);
    }

    .button-negative {
        border-color: var(--danger-border);
        background: var(--danger-bg);
        color: var(--danger-text);
    }

    .button-positive {
        border-color: var(--success-border);
        background: var(--success-bg);
        color: var(--success-text);
    }

    .button-accent {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--bg);
    }

    :global(.button-group) {
        display: flex;
        align-items: stretch;
        gap: 0;
    }

    :global(.button-group > :first-child) {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
    }

    :global(.button-group .dropdown-button) {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left: none;
    }
</style>
