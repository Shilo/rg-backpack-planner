<script lang="ts">
  import type { ComponentType } from "svelte";
  import { createEventDispatcher } from "svelte";
  import { showToast } from "./toast";
  import { tooltip } from "./tooltip";

  export let icon: ComponentType | null = null;
  export let iconClass = "button-icon";
  export let iconAriaHidden = true;
  export let type: "button" | "submit" | "reset" = "button";
  export let small = false;
  export let negative = false;
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
    negative ? "button-negative" : "",
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
</script>

<button
  {type}
  class={computedClass}
  bind:this={element}
  {disabled}
  use:tooltip={tooltipText}
  on:click={handleClick}
  on:contextmenu={forward}
  on:pointerdown={forward}
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
    />
  {/if}
  <slot />
</button>

<style>
  .button {
    border: 1px solid #2c3c61;
    background: rgba(17, 27, 45, 0.7);
    color: #d4e1ff;
    border-radius: 12px;
    text-align: left;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease;
  }

  .button.with-icon {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .button-icon {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    .button:hover {
      filter: brightness(1.25);
    }
  }

  .button:active {
    transform: scale(0.95);
    filter: brightness(1.25);
  }

  .button-sm {
    min-height: 32px;
    font-size: 0.75rem;
  }

  .button-md {
    min-height: 42px;
    padding: 10px 14px;
    font-size: 0.9rem;
  }

  .button-negative {
    border-color: rgba(180, 72, 72, 0.9);
    background: rgba(84, 26, 32, 0.85);
    color: #ffd7d7;
  }
</style>
