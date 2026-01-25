<script lang="ts">
  import type { ComponentType } from "svelte";
  import { CopyIcon } from "phosphor-svelte";
  import { onDestroy } from "svelte";
  import Button from "../Button.svelte";
  import CheckboxIcon from "../icons/CheckboxIcon.svelte";

  export let onCopy: (() => void) | null = null;
  const label = "Copy";
  const copiedLabel = "Copied";
  export let confirmDurationMs = 2000;
  export let small = true;

  let copied = false;
  let resetTimeout: ReturnType<typeof setTimeout> | null = null;
  let restClass: string | undefined;
  let buttonProps: Record<string, unknown> = {};
  let icon: ComponentType | null = null;

  $: ({ class: restClass, ...buttonProps } = $$restProps);
  $: icon = copied
    ? (CheckboxIcon as unknown as ComponentType)
    : (CopyIcon as unknown as ComponentType);

  const clearTimer = () => {
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }
  };

  const handleClick = () => {
    onCopy?.();
    copied = true;
    clearTimer();
    resetTimeout = setTimeout(() => {
      copied = false;
      resetTimeout = null;
    }, confirmDurationMs);
  };

  onDestroy(() => {
    clearTimer();
  });
</script>

<Button
  {...buttonProps}
  class={restClass}
  {small}
  {icon}
  tooltipText={copied ? copiedLabel : label}
  aria-label={copied ? copiedLabel : label}
  on:click={handleClick}
/>
