<script lang="ts">
  import { onMount, tick } from "svelte";
  import { tooltipStore } from "./tooltip";

  let tooltipEl: HTMLDivElement | null = null;
  let boundedX = 0;
  let boundedY = 0;

  const TOOLTIP_MARGIN = 8;
  const TOOLTIP_OFFSET = 12;

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function updateBounds() {
    if (!tooltipEl) {
      boundedX = $tooltipStore.x;
      boundedY = $tooltipStore.y;
      return;
    }
    const rect = tooltipEl.getBoundingClientRect();
    const left = clamp(
      $tooltipStore.x - rect.width / 2,
      TOOLTIP_MARGIN,
      window.innerWidth - rect.width - TOOLTIP_MARGIN,
    );
    const top = clamp(
      $tooltipStore.y - rect.height - TOOLTIP_OFFSET,
      TOOLTIP_MARGIN,
      window.innerHeight - rect.height - TOOLTIP_MARGIN,
    );
    boundedX = left;
    boundedY = top;
  }

  onMount(() => {
    const handleResize = () => {
      if ($tooltipStore.isOpen) {
        updateBounds();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });

  $: if ($tooltipStore.isOpen) {
    $tooltipStore.x;
    $tooltipStore.y;
    tick().then(updateBounds);
  }
</script>

{#if $tooltipStore.isOpen}
  <div
    class="tooltip"
    bind:this={tooltipEl}
    style={`left: ${boundedX}px; top: ${boundedY}px;`}
    aria-hidden="true"
  >
    {$tooltipStore.text}
  </div>
{/if}
