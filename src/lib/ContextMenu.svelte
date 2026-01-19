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
      boundedY = y;
      return;
    }
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
    const top = clamp(y - offsetY, MENU_MARGIN, maxTop);
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

  :global(.context-menu button) {
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

  :global(.context-menu button:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
  }

  :global(.context-menu button:focus-visible) {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }
</style>
