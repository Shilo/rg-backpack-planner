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
    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const rect = tooltipEl.getBoundingClientRect();
    const maxLeft = Math.max(
      TOOLTIP_MARGIN + viewportLeft,
      viewportLeft + viewportWidth - rect.width - TOOLTIP_MARGIN,
    );
    const maxTop = Math.max(
      TOOLTIP_MARGIN + viewportTop,
      viewportTop + viewportHeight - rect.height - TOOLTIP_MARGIN,
    );
    const left = clamp(
      $tooltipStore.x - rect.width / 2,
      TOOLTIP_MARGIN + viewportLeft,
      maxLeft,
    );
    const top = clamp(
      $tooltipStore.y - rect.height - TOOLTIP_OFFSET,
      TOOLTIP_MARGIN + viewportTop,
      maxTop,
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
    const viewport = window.visualViewport;
    window.addEventListener("resize", handleResize);
    viewport?.addEventListener("resize", handleResize);
    viewport?.addEventListener("scroll", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      viewport?.removeEventListener("resize", handleResize);
      viewport?.removeEventListener("scroll", handleResize);
    };
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
