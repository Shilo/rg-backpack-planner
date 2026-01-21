<script lang="ts">
  import type { ComponentType } from "svelte";
  import { Share2 } from "lucide-svelte";
  import { onDestroy } from "svelte";
  import Button from "../Button.svelte";
  import CheckboxIcon from "../icons/CheckboxIcon.svelte";

  export let onShare: (() => void) | null = null;
  export let confirmDurationMs = 2000;
  export let toastMessage: string | undefined = undefined;
  export let toastNegative = false;

  const label = "Share build";
  const copiedLabel = "Copied";

  let copied = false;
  let resetTimeout: ReturnType<typeof setTimeout> | null = null;
  let restClass: string | undefined;
  let buttonProps: Record<string, unknown> = {};
  let icon: ComponentType | null = null;

  $: ({ class: restClass, ...buttonProps } = $$restProps);
  $: icon = copied
    ? (CheckboxIcon as unknown as ComponentType)
    : (Share2 as unknown as ComponentType);

  const clearTimer = () => {
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }
  };

  const handleClick = () => {
    onShare?.();
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
  {icon}
  tooltipText={copied ? copiedLabel : label}
  aria-label={copied ? copiedLabel : label}
  {toastMessage}
  {toastNegative}
  on:click={handleClick}
/>
