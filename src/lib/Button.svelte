<script lang="ts">
    import type { Component } from "svelte";
    import { createEventDispatcher, onDestroy } from "svelte";
    import { showToast } from "./toast";
    import { tooltip, type TooltipContent } from "./tooltip";
    import { primary, secondary, buildShortcutTooltip, shortcutFlash } from "./input";
    import type { KeyboardActionType } from "./input";
    import { CaretRightIcon, CaretDownIcon } from "phosphor-svelte";

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
    export let ghost = false;
    export let disabled: boolean | undefined = undefined;
    export let tooltipText: TooltipContent | undefined = undefined;
    /** When true, tooltip only shows on hover (e.g. mouse); long-press on touch will not show it. */
    export let tooltipHoverOnly = false;
    export let element: HTMLButtonElement | null = null;
    export let toastMessage: string | undefined = undefined;
    export let toastNegative = false;
    export let toastDurationMs: number | undefined = undefined;
    export let arrow: "right" | "down" | undefined = undefined;
    export let description: string | undefined = undefined;
    export let descriptionIcon: Component | null = null;
    export let shortcut: string | undefined = undefined;
    export let flashOnAction: KeyboardActionType | undefined = undefined;

    let restClass: string | undefined;
    let buttonProps: Record<string, unknown> = {};

    $: ({ class: restClass, ...buttonProps } = $$restProps);
    $: resolvedTooltip = buildShortcutTooltip(tooltipText, shortcut);
    $: tooltipParam =
        resolvedTooltip == null
            ? undefined
            : tooltipHoverOnly
              ? { content: resolvedTooltip, hoverOnly: true }
              : resolvedTooltip;

    let isFlashing = false;
    const unsubFlash = flashOnAction
        ? shortcutFlash.subscribe((v) => { isFlashing = v === flashOnAction; })
        : undefined;
    onDestroy(() => unsubFlash?.());

    $: computedClass = [
        "button",
        small ? "button-sm" : "button-md",
        negative ? "button-negative" : positive ? "button-positive" : accent ? "button-accent" : "",
        ghost ? "button-ghost" : "",
        restClass,
        icon || arrow ? "with-icon" : "",
        arrow ? "with-arrow" : "",
        isFlashing ? "button-flash" : "",
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
                | "pointerdown"
                | "pointermove"
                | "pointerup"
                | "pointercancel"
                | "pointerleave",
            event as never,
        );
    };

    /** Minimal event-like object so consumers can call stopPropagation/preventDefault
     *  and read currentTarget/target for menu anchoring without crashing. */
    function syntheticEvent(): MouseEvent {
        return {
            stopPropagation() {},
            stopImmediatePropagation() {},
            preventDefault() {},
            currentTarget: element,
            target: element,
        } as unknown as MouseEvent;
    }

    const handlePrimary = () => {
        dispatch("click", syntheticEvent());
        if (toastMessage) {
            showToast(toastMessage, {
                tone: toastNegative ? "negative" : "positive",
                durationMs: toastDurationMs,
            });
        }
    };

    const handleSecondary = () => {
        dispatch("contextmenu", syntheticEvent());
    };

    const handlePointerDown = (event: PointerEvent) => {
        forward(event);
    };
</script>

<button
    {type}
    class={computedClass}
    bind:this={element}
    {disabled}
    use:tooltip={tooltipParam}
    use:primary={handlePrimary}
    use:secondary={handleSecondary}
    on:pointerdown={handlePointerDown}
    on:pointermove={forward}
    on:pointerup={(e) => { forward(e); element?.blur(); }}
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
    {#if description}
        <span class="button-text-group">
            <span class="button-text">
                <slot />
            </span>
            <span class="button-description"
                >{#if descriptionIcon}<svelte:component
                        this={descriptionIcon}
                        class="button-description-icon"
                        aria-hidden={true}
                        size={12}
                    />{/if}{description}</span
            >
        </span>
    {:else}
        <span class="button-text">
            <slot />
        </span>
    {/if}
    {#if arrow === "right"}
        <CaretRightIcon class="button-arrow" size={12} aria-hidden={true} />
    {:else if arrow === "down"}
        <CaretDownIcon class="button-arrow" size={12} aria-hidden={true} />
    {/if}
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
            transform var(--ease),
            filter var(--ease);
    }

    .button:not(:disabled) {
        cursor: pointer;
    }

    .button.with-icon {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .button.with-icon:has(.button-text:not(:empty)) {
        min-width: 0;
    }

    .button.with-arrow {
        max-width: 100%;
        padding-right: var(--spacing-sm);
    }

    .button:has(.button-text:empty) {
        padding: 0;
        justify-content: center;
        gap: 0;
        text-align: center;
    }

    .button-text {
        line-height: var(--leading);
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .button.with-arrow .button-text,
    .button.with-arrow .button-text-group {
        flex: 1;
        min-width: 0;
        white-space: normal;
        overflow-wrap: anywhere;
    }

    :global(.button-arrow) {
        flex: 0 0 auto;
        opacity: 0.5;
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

    @media (hover: hover) {
        .button:not(:disabled):hover {
            filter: var(--brightness-hover);
        }
    }

    .button:not(:disabled):active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    .button.button-flash:not(:disabled) {
        filter: brightness(1.4);
        transform: scale(0.85);
        background: var(--bg-input);
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

    /* button-sm touch targets are intentionally 32px for compact HUD toolbar buttons.
       WCAG 2.5.5 (AA) 24px minimum is met. */

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

    .button-ghost {
        background: transparent;
    }

    @media (hover: hover) {
        .button-negative.button-ghost:not(:disabled):hover {
            filter: none;
            background: var(--danger-bg);
        }
    }

    .button-negative.button-ghost:not(:disabled):active {
        filter: none;
        background: var(--danger-bg);
        transform: scale(0.96);
    }

    :global(.button-group) {
        display: flex;
        align-items: stretch;
        gap: 0;
    }

    /* Let all group members stretch to match the tallest (e.g. when text wraps) */
    :global(.button-group > *) {
        align-self: stretch;
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

    .button-text-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        flex: 1;
        min-width: 0;
        line-height: var(--leading);
    }

    .button-description {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        white-space: normal;
        overflow-wrap: anywhere;
    }

</style>
