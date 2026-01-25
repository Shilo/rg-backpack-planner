<script lang="ts">
  import type { ComponentType } from "svelte";
  import { createEventDispatcher } from "svelte";
  import { showToast } from "./toast";
  import { tooltip } from "./tooltip";
  import { triggerHaptic } from "./haptics";

  export let icon: ComponentType | null = null;
  export let iconClass = "button-icon";
  export let iconAriaHidden = true;
  export let iconSize: number | string | undefined = 26;
  export let type: "button" | "submit" | "reset" = "button";
  export let small = false;
  export let negative = false;
  export let positive = false;
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
    negative ? "button-negative" : positive ? "button-positive" : "",
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
    />
  {/if}
  <span class="button-text">
    <slot />
  </span>
</button>

<style>
  .button {
    border: 1px solid #2c3c61;
    background: rgba(17, 27, 45, 0.7);
    color: #d4e1ff;
    border-radius: 12px;
    text-align: left;
    line-height: 1;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease;
  }

  .button:not(:disabled) {
    cursor: pointer;
  }

  .button.with-icon {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .button:has(.button-text:empty) {
    padding: 0 !important;
    justify-content: center !important;
    gap: 0 !important;
    text-align: center !important;
  }

  .button-text {
    line-height: 1.1;
  }

  .button-icon {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: rgba(46, 63, 98, 0.7);
    background: rgba(12, 18, 31, 0.6);
    color: rgba(152, 170, 210, 0.75);
    filter: none;
    transform: none;
  }

  .button:focus-visible {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }

  .button {
    transition:
      transform 0.12s ease,
      filter 0.12s ease;
  }

  @media (hover: hover) {
    .button:not(:disabled):hover {
      filter: brightness(1.18);
    }
  }

  .button:not(:disabled):active {
    transform: scale(0.97);
    filter: brightness(1.2);
  }

  .button-sm {
    height: 32px;
    min-width: 32px;
    font-size: 0.75rem;
  }

  .button-md {
    min-height: 38px;
    min-width: 38px;
    padding: 4px 12px;
    font-size: 0.85rem;
  }

  .button-negative {
    border-color: rgba(180, 72, 72, 0.9);
    background: rgba(84, 26, 32, 0.85);
    color: #ffd7d7;
  }

  .button-positive {
    border-color: rgba(70, 162, 120, 0.9);
    background: rgba(18, 54, 40, 0.85);
    color: #d9ffe9;
  }
</style>
