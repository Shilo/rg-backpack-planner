<script lang="ts">
    import { onMount, tick } from "svelte";
    import { triggerHaptic } from "./hapticsStore";
    import { t } from "svelte-whisper";

    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let title = "";
    export let ariaLabel = "";
    export let onClose: (() => void) | null = null;
    /** When set, don't close on pointerup if target matches (e.g. tab bar for tab context menu) */
    export let ignoreCloseTargetSelector: string | null = null;
    /** When true, (x,y) is the point just above the menu; menu is positioned with its top at y. */
    export let anchorBelow = false;
    let menuEl: HTMLDivElement | null = null;
    let displayX = 0;
    let displayY = 0;

    const TOUCH_OFFSET_Y = 32;
    const DRAG_THRESHOLD = 5; // Minimum movement to start dragging
    const MENU_MARGIN = 8;

    const isCoarsePointer = () =>
        window.matchMedia("(pointer: coarse)").matches;

    let isDragging = false;
    let backdropHadPointerDown = false;
    let dragOffset = { x: 0, y: 0 }; // Offset from original position
    let dragStart: {
        x: number;
        y: number;
        menuX: number;
        menuY: number;
    } | null = null;
    let pointerId: number | null = null;
    let wasOpen = false; // Track previous open state
    let lastX = 0;
    let lastY = 0;
    let backdropEl: HTMLButtonElement | null = null;
    let isNested = false;
    $: resolvedTitle = title || "";
    $: resolvedAriaLabel = ariaLabel || "Context menu";

    function handleDocumentPointerUp(event: PointerEvent) {
        if (!isOpen) return;
        // Don't close if we're dragging or if the pointer is within the menu
        if (isDragging || pointerId === event.pointerId) return;
        const target = event.target;
        if (target instanceof Node && menuEl?.contains(target)) return;
        // Don't close if clicking on the backdrop (it handles its own close)
        if (target instanceof Node && backdropEl?.contains(target)) return;
        // Don't close if clicking on a nested context menu backdrop
        if (target instanceof Element) {
            const nestedBackdrop = target.closest(".context-menu-backdrop");
            if (nestedBackdrop && nestedBackdrop !== backdropEl) return;
        }
        // Don't close if interacting with a modal dialog
        if (target instanceof Element) {
            const modalElement = target.closest(
                ".modal-backdrop, .modal-shell",
            );
            if (modalElement) return;
        }
        // Don't close if clicking on a nested context menu (ShareBuildButton's menu)
        if (target instanceof Element) {
            const nestedMenu = target.closest(".context-menu");
            if (nestedMenu && nestedMenu !== menuEl) return;
            const shareMenuPortal = target.closest(".share-menu-portal");
            if (shareMenuPortal) return;
        }
        // Don't close on pointerup if it's the same pointer that started a drag
        if (event.pointerId === pointerId) return;
        // Don't close when target matches (e.g. tab bar - release from long-press on tab)
        if (
            ignoreCloseTargetSelector &&
            target instanceof Element &&
            target.closest(ignoreCloseTargetSelector)
        )
            return;

        onClose?.();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!isOpen) return;
        if (event.key === "Escape") {
            // Only close the topmost (last in DOM order) context menu
            const allMenus = document.querySelectorAll(".context-menu");
            if (allMenus.length > 1 && allMenus[allMenus.length - 1] !== menuEl) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            onClose?.();
        }
    }

    function handleBackdropPointerDown(event: PointerEvent) {
        event.stopPropagation();
        backdropHadPointerDown = true;
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target !== event.currentTarget) return;
        // Only close if there was a pointerdown on backdrop first (avoids close from touch release after long-press)
        if (!backdropHadPointerDown) return;
        event.preventDefault();
        event.stopPropagation();
        triggerHaptic();
        onClose?.();
    }

    function handleBackdropContextMenu(event: MouseEvent) {
        if (event.target !== event.currentTarget) return;
        // Only close if there was a pointerdown on backdrop first (avoids close from touch release after long-press)
        if (!backdropHadPointerDown) return;
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
    }

    function handleBackdropPointerUp(event: PointerEvent) {
        if (event.target !== event.currentTarget) return;
        event.stopPropagation();
    }

    function handleBackdropKeydown(event: KeyboardEvent) {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        triggerHaptic();
        onClose?.();
    }

    function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    export function updatePosition() {
        if (!menuEl) {
            const adjustedY =
                y + (anchorBelow ? 0 : isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
            displayX = x + dragOffset.x;
            displayY = adjustedY + dragOffset.y;
            return;
        }

        const adjustedY =
            y + (anchorBelow ? 0 : isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
        const baseX = x + dragOffset.x;
        const baseY = adjustedY + dragOffset.y;

        // Get menu dimensions
        const rect = menuEl.getBoundingClientRect();
        const offsetX = rect.width / 2;
        const offsetY = anchorBelow ? 0 : rect.height * 0.1;

        // Calculate bounds - keep menu within viewport
        const minX = MENU_MARGIN + offsetX;
        const maxX = window.innerWidth - MENU_MARGIN - offsetX;
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
        if (tagName === "button" || tagName === "a" || tagName === "input")
            return true;
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
        const menuCenterY = anchorBelow
            ? rect.top
            : rect.top + rect.height * 0.1;

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
            const adjustedY =
                y + (anchorBelow ? 0 : isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
            dragOffset.x = newMenuX - x;
            dragOffset.y = newMenuY - adjustedY;

            // Update position with bounds checking
            updatePosition();

            // After clamping, update dragOffset to reflect the actual clamped position
            const adjustedYBase =
                y + (anchorBelow ? 0 : isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
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
        if (justOpened) {
            isNested = document.querySelectorAll(".context-menu").length > 0;
        }
        const positionChanged = wasOpen && (x !== lastX || y !== lastY);
        wasOpen = true;
        lastX = x;
        lastY = y;

        if ((justOpened || positionChanged) && !isDragging) {
            dragOffset = { x: 0, y: 0 };
        }

        tick().then(updatePosition);
    }

    $: transformOrigin = anchorBelow
        ? "translate(-50%, 0)"
        : "translate(-50%, -10%)";

    // Reset when menu closes
    $: if (!isOpen && wasOpen) {
        dragOffset = { x: 0, y: 0 };
        wasOpen = false;
        lastX = 0;
        lastY = 0;
        isDragging = false;
        dragStart = null;
        pointerId = null;
        backdropHadPointerDown = false;
    }
</script>

{#if isOpen}
    {#if !isNested}
        <button
            class="context-menu-backdrop"
            type="button"
            tabindex="0"
            aria-label={$t("common.close")}
            bind:this={backdropEl}
            on:pointerdown={handleBackdropPointerDown}
            on:pointerup={handleBackdropPointerUp}
            on:click={handleBackdropClick}
            on:contextmenu={handleBackdropContextMenu}
            on:keydown={handleBackdropKeydown}
        ></button>
    {/if}
    <div
        class="context-menu"
        class:dragging={isDragging}
        bind:this={menuEl}
        style={`transform: translate(${displayX}px, ${displayY}px) ${transformOrigin};`}
        role="menu"
        tabindex="-1"
        aria-label={resolvedAriaLabel}
        on:pointerdown={handlePointerDown}
        on:pointermove={handlePointerMove}
        on:pointerup={handlePointerUp}
        on:pointercancel={handlePointerUp}
    >
        {#if resolvedTitle}
            <div class="context-menu__title">{resolvedTitle}</div>
        {/if}
        <slot />
    </div>
{/if}

<style>
    .context-menu {
        position: fixed;
        left: 0;
        top: 0;
        /* transform set inline — combines translate(x,y) positioning with centering offset */
        background: var(--bg-panel);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        padding: var(--spacing-md);
        display: grid;
        gap: var(--spacing-md);
        z-index: var(--z-index-context-menu);
        width: max-content;
        max-width: calc(100vw - 16px);
        cursor: move;
        touch-action: none;
        user-select: none;
        box-shadow: var(--shadow), var(--shadow-lg);
        animation: ctx-menu-enter 0.15s cubic-bezier(0.05, 0.7, 0.1, 1) both;
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
        font-size: var(--font-base);
        letter-spacing: var(--tracking);
        color: var(--text-disabled);
        padding-left: var(--spacing-sm);
        overflow-wrap: anywhere;
        word-break: break-word;
        hyphens: auto;
    }

    .context-menu-backdrop {
        position: fixed;
        inset: 0;
        background: var(--backdrop-overlay-context);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        border: none;
        padding: 0;
        z-index: calc(var(--z-index-context-menu) - 1);
        cursor: default;
        animation: modal-backdrop-in 0.12s ease both;
    }

    @keyframes ctx-menu-enter {
        from { opacity: 0; }
        to { opacity: 1; }
    }
</style>
