<script lang="ts" context="module">
    let menuIdCounter = 0;
    const openMenuStack: number[] = [];

    function registerMenu(): number {
        const id = menuIdCounter++;
        openMenuStack.push(id);
        return id;
    }

    function unregisterMenu(id: number): void {
        const idx = openMenuStack.indexOf(id);
        if (idx !== -1) openMenuStack.splice(idx, 1);
    }

    function isTopmostMenu(id: number): boolean {
        return openMenuStack.length === 0 || openMenuStack[openMenuStack.length - 1] === id;
    }
</script>

<script lang="ts">
    import { onMount, tick } from "svelte";
    import { triggerHaptic } from "./hapticsStore";
    import { t } from "svelte-whisper";
    import { Key, onKeyDown } from "./input";

    let myMenuId = -1;

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
    /** When true, (x,y) is the point just below the menu; menu is positioned with its bottom at y (opens upward). */
    export let anchorAbove = false;
    /** When true with anchorAbove, pins the top edge on first render so content-height changes only shift the bottom. */
    export let stableTop = false;
    /** When true and coarse pointer (touch), place menu above the point with bottom at y - TOUCH_OFFSET_Y. */
    export let touchAnchorAbove = false;
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
    let pinnedHeight = 0; // Height captured on first render for stableTop mode
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
        if (event.key === Key.Escape) {
            // Only close the topmost (most recently opened) context menu
            if (!isTopmostMenu(myMenuId)) return;
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
        if (event.key !== Key.Enter && event.key !== Key.Space) return;
        event.preventDefault();
        triggerHaptic();
        onClose?.();
    }

    function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    function getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
        const root = document.documentElement;
        const s = getComputedStyle(root);
        const px = (key: string) => parseFloat(s.getPropertyValue(key)) || 0;
        return {
            top: px("--safe-top"),
            right: px("--safe-right"),
            bottom: px("--safe-bottom"),
            left: px("--safe-left"),
        };
    }

    export function updatePosition() {
        const coarse = isCoarsePointer();
        const useTouchAbove = touchAnchorAbove && coarse;
        const safe = getSafeAreaInsets();

        if (!menuEl) {
            const adjustedY = anchorAbove
                ? 0
                : anchorBelow
                  ? 0
                  : useTouchAbove
                    ? -TOUCH_OFFSET_Y
                    : coarse
                      ? TOUCH_OFFSET_Y
                      : 0;
            displayX = x + dragOffset.x;
            displayY = (useTouchAbove ? y - TOUCH_OFFSET_Y : anchorAbove ? y : y + adjustedY) + dragOffset.y;
            return;
        }

        const rect = menuEl.getBoundingClientRect();
        // Capture height on first measurement for stableTop mode
        if (stableTop && anchorAbove && pinnedHeight === 0) {
            pinnedHeight = rect.height;
        }
        const offsetX = rect.width / 2;
        let baseX = x + dragOffset.x;
        let baseY: number;
        let minY: number;
        let maxY: number;

        if (anchorAbove) {
            baseY = y + dragOffset.y;
            const boundHeight = stableTop && pinnedHeight > 0 ? Math.max(pinnedHeight, rect.height) : rect.height;
            minY = safe.top + MENU_MARGIN + boundHeight;
            maxY = window.innerHeight - safe.bottom - MENU_MARGIN;
        } else if (useTouchAbove) {
            baseY = y - TOUCH_OFFSET_Y + dragOffset.y;
            minY = safe.top + MENU_MARGIN + rect.height;
            maxY = window.innerHeight - safe.bottom - MENU_MARGIN;
        } else {
            const offsetY = anchorBelow ? 0 : rect.height * 0.1;
            const adjustedY =
                y + (anchorBelow ? 0 : coarse ? TOUCH_OFFSET_Y : 0) + dragOffset.y;
            baseY = adjustedY;
            minY = safe.top + MENU_MARGIN + offsetY;
            maxY = window.innerHeight - safe.bottom - MENU_MARGIN - (rect.height - offsetY);
        }

        const minX = safe.left + MENU_MARGIN + offsetX;
        const maxX = window.innerWidth - safe.right - MENU_MARGIN - offsetX;
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
        const menuCenterY =
            anchorAbove || (touchAnchorAbove && isCoarsePointer())
                ? rect.top + (stableTop && pinnedHeight > 0 ? pinnedHeight : rect.height)
                : anchorBelow
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
            const adjustedY = anchorAbove
                ? y
                : y + (anchorBelow ? 0 : isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
            dragOffset.x = newMenuX - x;
            dragOffset.y = newMenuY - adjustedY;

            // Update position with bounds checking
            updatePosition();

            // After clamping, update dragOffset to reflect the actual clamped position
            const adjustedYBase = anchorAbove
                ? y
                : y + (anchorBelow ? 0 : isCoarsePointer() ? TOUCH_OFFSET_Y : 0);
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

    onKeyDown(handleKeydown);

    onMount(() => {
        document.addEventListener("pointerup", handleDocumentPointerUp, {
            capture: true,
        });
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
            window.removeEventListener("resize", handleResize);
            // Clean up registry if component is destroyed while open
            if (myMenuId !== -1) {
                unregisterMenu(myMenuId);
                myMenuId = -1;
            }
        };
    });

    $: if (isOpen) {
        // Only reset drag offset when menu first opens (transition from closed to open)
        // or when x/y change while menu is already open (programmatic repositioning)
        const justOpened = !wasOpen;
        if (justOpened) {
            isNested = openMenuStack.length > 0;
            myMenuId = registerMenu();
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

    $: transformOrigin =
        anchorAbove || (touchAnchorAbove && isCoarsePointer())
            ? (stableTop && pinnedHeight > 0
                ? `translate(-50%, -${pinnedHeight}px)`
                : "translate(-50%, -100%)")
            : anchorBelow
              ? "translate(-50%, 0)"
              : "translate(-50%, -10%)";

    // Reset when menu closes
    $: if (!isOpen && wasOpen) {
        unregisterMenu(myMenuId);
        myMenuId = -1;
        dragOffset = { x: 0, y: 0 };
        wasOpen = false;
        lastX = 0;
        lastY = 0;
        isDragging = false;
        dragStart = null;
        pointerId = null;
        backdropHadPointerDown = false;
        pinnedHeight = 0;
    }
</script>

{#if isOpen}
    <button
            class="context-menu-backdrop"
            class:nested={isNested}
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
        overflow-wrap: break-word;
    }

    .context-menu-backdrop {
        position: fixed;
        inset: 0;
        background: var(--backdrop-overlay-context);
        backdrop-filter: blur(var(--blur-xs));
        -webkit-backdrop-filter: blur(var(--blur-xs));
        border: none;
        padding: 0;
        z-index: var(--z-index-context-menu-backdrop);
        cursor: default;
        animation: modal-backdrop-in 0.12s ease both;
    }

    .context-menu-backdrop.nested {
        background: transparent;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        animation: none;
    }

    @keyframes ctx-menu-enter {
        from { opacity: 0; }
        to { opacity: 1; }
    }
</style>
