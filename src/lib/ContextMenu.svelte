<script lang="ts">
  import { onMount, tick } from "svelte";

  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let title = "Menu";
  export let ariaLabel = "Context menu";
  export let onClose: (() => void) | null = null;

  let menuEl: HTMLDivElement | null = null;
  let boundedX = 0;
  let boundedY = 0;

  const MENU_MARGIN = 8;
  const TOUCH_OFFSET_Y = 32;

  const isCoarsePointer = () => window.matchMedia("(pointer: coarse)").matches;

  function handleDocumentPointer(event: PointerEvent) {
    if (!isOpen) return;
    const target = event.target;
    if (target instanceof Node && menuEl?.contains(target)) return;
    onClose?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function updateBounds() {
    if (!menuEl) {
      boundedX = x;
      boundedY = y + (isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
      return;
    }
    const adjustedY = y + (isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
    const rect = menuEl.getBoundingClientRect();
    const offsetX = rect.width / 2;
    const offsetY = rect.height * 0.1;
    const maxLeft = Math.max(
      MENU_MARGIN,
      window.innerWidth - rect.width - MENU_MARGIN,
    );
    const maxTop = Math.max(
      MENU_MARGIN,
      window.innerHeight - rect.height - MENU_MARGIN,
    );
    const left = clamp(x - offsetX, MENU_MARGIN, maxLeft);
    const top = clamp(adjustedY - offsetY, MENU_MARGIN, maxTop);
    boundedX = left + offsetX;
    boundedY = top + offsetY;
  }

  onMount(() => {
    document.addEventListener("pointerdown", handleDocumentPointer, {
      capture: true,
    });
    document.addEventListener("keydown", handleKeydown);
    const handleResize = () => {
      if (isOpen) {
        updateBounds();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointer, {
        capture: true,
      });
      document.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("resize", handleResize);
    };
  });

  $: if (isOpen) {
    x;
    y;
    tick().then(updateBounds);
  }
</script>

{#if isOpen}
  <div
    class="context-menu"
    bind:this={menuEl}
    style={`left: ${boundedX}px; top: ${boundedY}px;`}
    role="menu"
    aria-label={ariaLabel}
  >
    <div class="context-menu__title">{title}</div>
    <slot />
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    transform: translate(-50%, -10%);
    background: rgba(10, 16, 28, 0.98);
    border: 1px solid #2f3f66;
    border-radius: 10px;
    padding: 8px;
    display: grid;
    gap: 6px;
    z-index: 20;
    width: max-content;
  }

  .context-menu__title {
    margin: 0;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(201, 214, 245, 0.75);
    padding-left: 4px;
  }

</style>
