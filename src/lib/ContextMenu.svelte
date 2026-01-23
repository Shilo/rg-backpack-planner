<script lang="ts">
  import { onMount, tick } from "svelte";
  import { triggerHaptic } from "./haptics";

  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let title = "Menu";
  export let ariaLabel = "Context menu";
  export let onClose: (() => void) | null = null;

  let menuEl: HTMLDivElement | null = null;
  let displayX = 0;
  let displayY = 0;

  const TOUCH_OFFSET_Y = 32;
  const DRAG_THRESHOLD = 5; // Minimum movement to start dragging
  const MENU_MARGIN = 8;

  const isCoarsePointer = () => window.matchMedia("(pointer: coarse)").matches;

  let isDragging = false;
  let dragOffset = { x: 0, y: 0 }; // Offset from original position
  let dragStart: { x: number; y: number; menuX: number; menuY: number } | null = null;
  let pointerId: number | null = null;
  let wasOpen = false; // Track previous open state
  let lastX = 0;
  let lastY = 0;
  let backdropEl: HTMLButtonElement | null = null;

  function handleDocumentPointerUp(event: PointerEvent) {
    if (!isOpen) return;
    // Don't close if we're dragging or if the pointer is within the menu
    if (isDragging || pointerId === event.pointerId) return;
    const target = event.target;
    if (target instanceof Node && menuEl?.contains(target)) return;
    // Don't close if clicking on the backdrop (it handles its own close)
    if (target instanceof Node && backdropEl?.contains(target)) return;
    // Don't close on pointerup if it's the same pointer that started a drag
    if (event.pointerId === pointerId) return;
    onClose?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target !== event.currentTarget) return;
    triggerHaptic();
    onClose?.();
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleBackdropClick(event as any);
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function updatePosition() {
    if (!menuEl) {
      const adjustedY = y + (isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
      displayX = x + dragOffset.x;
      displayY = adjustedY + dragOffset.y;
      return;
    }

    const adjustedY = y + (isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
    const baseX = x + dragOffset.x;
    const baseY = adjustedY + dragOffset.y;

    // Get menu dimensions
    const rect = menuEl.getBoundingClientRect();
    const offsetX = rect.width / 2;
    const offsetY = rect.height * 0.1;

    // Calculate bounds - keep menu within viewport
    // displayX is the center, so we need width/2 margin on each side
    const minX = MENU_MARGIN + offsetX;
    const maxX = window.innerWidth - MENU_MARGIN - offsetX;
    // displayY is 10% from top, so top edge is at displayY - offsetY, bottom edge is at displayY + (height - offsetY)
    const minY = MENU_MARGIN + offsetY;
    const maxY = window.innerHeight - MENU_MARGIN - (rect.height - offsetY);

    // Clamp position to viewport bounds
    displayX = clamp(baseX, minX, maxX);
    displayY = clamp(baseY, minY, maxY);
  }

  function isInteractiveElement(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Element)) return false;
    // Check if target is a button, link, or has click handlers
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'button' || tagName === 'a' || tagName === 'input') return true;
    // Check if target has a button role or is inside a button
    if (target.closest('button, a, [role="button"]')) return true;
    return false;
  }

  function handlePointerDown(event: PointerEvent) {
    if (!menuEl) return;
    // Only handle primary pointer (left mouse button or touch)
    if (event.pointerType === "mouse" && event.button !== 0) return;
    
    // Don't start drag if clicking on an interactive element - let it handle normally
    if (isInteractiveElement(event.target)) {
      // Still stop propagation to prevent document handler from closing menu
      event.stopPropagation();
      return;
    }
    
    // Stop propagation to prevent document handler from closing menu
    event.stopPropagation();
    menuEl.setPointerCapture(event.pointerId);
    pointerId = event.pointerId;
    
    const rect = menuEl.getBoundingClientRect();
    const menuCenterX = rect.left + rect.width / 2;
    const menuCenterY = rect.top + rect.height * 0.1;
    
    dragStart = {
      x: event.clientX,
      y: event.clientY,
      menuX: menuCenterX,
      menuY: menuCenterY,
    };
    isDragging = false;
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragStart || pointerId !== event.pointerId) return;
    
    // If moving over an interactive element while not yet dragging, cancel drag
    if (!isDragging && isInteractiveElement(event.target)) {
      if (menuEl) {
        menuEl.releasePointerCapture(event.pointerId);
      }
      dragStart = null;
      pointerId = null;
      return;
    }
    
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    const distance = Math.hypot(dx, dy);
    
    // Start dragging after threshold to avoid accidental drags
    if (!isDragging && distance > DRAG_THRESHOLD) {
      isDragging = true;
      event.preventDefault();
    }
    
    if (isDragging) {
      event.preventDefault();
      
      // Calculate new position based on drag from starting position
      const newMenuX = dragStart.menuX + dx;
      const newMenuY = dragStart.menuY + dy;
      
      // Calculate offset from original position
      const adjustedY = y + (isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
      dragOffset.x = newMenuX - x;
      dragOffset.y = newMenuY - adjustedY;
      
      // Update position with bounds checking
      updatePosition();
      
      // After clamping, update dragOffset to reflect the actual clamped position
      // Use displayX/displayY which are the clamped values
      const adjustedYBase = y + (isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
      dragOffset.x = displayX - x;
      dragOffset.y = displayY - adjustedYBase;
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    
    if (menuEl) {
      menuEl.releasePointerCapture(event.pointerId);
    }
    
    // If we didn't drag (or dragged very little), allow the click to proceed
    if (!isDragging) {
      // Don't prevent default - allow button clicks to work
    }
    
    isDragging = false;
    dragStart = null;
    pointerId = null;
  }

  onMount(() => {
    document.addEventListener("pointerup", handleDocumentPointerUp, {
      capture: true,
    });
    document.addEventListener("keydown", handleKeydown);
    const handleResize = () => {
      if (isOpen) {
        updatePosition();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerup", handleDocumentPointerUp, {
        capture: true,
      });
      document.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("resize", handleResize);
    };
  });

  $: if (isOpen) {
    // Only reset drag offset when menu first opens (transition from closed to open)
    // or when x/y change while menu is already open (programmatic repositioning)
    const justOpened = !wasOpen;
    const positionChanged = wasOpen && (x !== lastX || y !== lastY);
    wasOpen = true;
    lastX = x;
    lastY = y;
    
    if ((justOpened || positionChanged) && !isDragging) {
      dragOffset = { x: 0, y: 0 };
    }
    
    tick().then(updatePosition);
  }

  // Reset drag offset when menu closes
  $: if (!isOpen && wasOpen) {
    dragOffset = { x: 0, y: 0 };
    wasOpen = false;
    lastX = 0;
    lastY = 0;
    isDragging = false;
    dragStart = null;
    pointerId = null;
  }
</script>

{#if isOpen}
  <button
    class="context-menu-backdrop"
    type="button"
    tabindex="0"
    aria-label="Close context menu"
    bind:this={backdropEl}
    on:click={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
  ></button>
  <div
    class="context-menu"
    class:dragging={isDragging}
    bind:this={menuEl}
    style={`left: ${displayX}px; top: ${displayY}px;`}
    role="menu"
    aria-label={ariaLabel}
    on:pointerdown={handlePointerDown}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
    on:pointercancel={handlePointerUp}
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
    cursor: move;
    touch-action: none;
    user-select: none;
  }

  .context-menu :global(button),
  .context-menu :global(a),
  .context-menu :global([role="button"]) {
    cursor: pointer;
    touch-action: auto;
    pointer-events: auto;
  }

  .context-menu.dragging {
    cursor: grabbing;
  }

  .context-menu__title {
    margin: 0;
    font-size: 0.85rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(201, 214, 245, 0.75);
    padding-left: 4px;
  }

  .context-menu-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(6, 9, 18, 0.72);
    border: none;
    padding: 0;
    z-index: 19;
    cursor: default;
  }
</style>
