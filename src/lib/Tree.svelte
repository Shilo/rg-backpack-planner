<script lang="ts" context="module">
  export type TreeNode = {
    id: string;
    x: number;
    y: number;
    maxLevel: number;
    label?: string;
    parentIds?: string[];
    radius?: number; // 0 to 1, where 1 is the maximum size
  };

  export type TreeViewState = {
    offsetX: number;
    offsetY: number;
    scale: number;
  };
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import { fade } from "svelte/transition";
  import Node, { type NodeState } from "./Node.svelte";
  import RootNode from "./RootNode.svelte";
  import NodeContentMenu from "./NodeContentMenu.svelte";
  import {
    LONG_PRESS_MOVE_THRESHOLD,
    clearLongPress,
    startLongPress,
    type LongPressState,
  } from "./longPress";
  import { showToast } from "./toast";
  import { hideTooltip, suppressTooltip } from "./tooltip";

  export let nodes: TreeNode[] = [];
  export let bottomInset = 0;
  export let gesturesDisabled = false;
  export let initialViewState: TreeViewState | null = null;
  export let onNodeLevelUp: ((nodeId: string) => void) | null = null;
  export let onNodeLevelChange:
    | ((delta: number, nodeId?: string) => void)
    | null = null;
  export let levelsById: Record<string, number> | null = null;
  export let onLevelsChange: ((levels: Record<string, number>) => void) | null =
    null;
  export let onViewStateChange: ((view: TreeViewState) => void) | null = null;
  export let onFocusViewStateChange:
    | ((view: TreeViewState | null) => void)
    | null = null;

  let levels: Record<string, number> = {};
  let contextMenu: { id: string; x: number; y: number } | null = null;

  let viewportEl: HTMLDivElement | null = null;
  let viewportSize = { width: 0, height: 0 };

  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let focusViewState: TreeViewState | null = null;

  // Calculate dynamic min/max scale based on node bounds
  $: scaleBounds = (() => {
    // Reference viewportSize to make this reactive to viewport size changes
    void viewportSize.width;
    void viewportSize.height;
    
    if (!viewportEl || nodes.length === 0) {
      return { minScale: 0.1, maxScale: 2.2 };
    }
    
    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX + 64;
    const height = maxY - minY + 64;
    
    const rect = viewportEl.getBoundingClientRect();
    const padding = 24;
    const availableW = Math.max(rect.width - padding * 2, 1);
    const availableH = Math.max(rect.height - bottomInset - padding * 2, 1);
    
    // Minimum scale: fit all nodes in viewport with some extra zoom out capability
    const minScaleToFit = Math.min(availableW / width, availableH / height);
    const minScale = Math.max(minScaleToFit * 0.5, 0.1); // Allow zooming out to 50% of fit scale, but not below 0.1
    
    // Maximum scale: allow zooming in reasonably
    const maxScale = 2.2;
    
    return { minScale, maxScale };
  })();
  $: minScale = scaleBounds.minScale;
  $: maxScale = scaleBounds.maxScale;

  type PointerState = {
    x: number;
    y: number;
    startX: number;
    startY: number;
    nodeId: string | null;
  };
  const pointers = new Map<number, PointerState>();

  let panStart: {
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null = null;
  let pinchStart: {
    distance: number;
    worldX: number;
    worldY: number;
    scale: number;
  } | null = null;
  let panActive = false;

  let primaryPointerId: number | null = null;
  let primaryStart: { x: number; y: number; nodeId: string | null } | null =
    null;

  const longPressState: LongPressState = { timer: null, fired: false };
  let fadeKey = 0;

  function updateLevels(nextLevels: Record<string, number>) {
    levels = nextLevels;
    onLevelsChange?.(levels);
  }

  $: if (levelsById) {
    levels = { ...levelsById };
  }

  $: {
    let nextLevels = levels;
    let changed = false;
    for (const node of regularNodes) {
      if (!(node.id in nextLevels)) {
        if (nextLevels === levels) {
          nextLevels = { ...levels };
        }
        nextLevels[node.id] = 0;
        changed = true;
      }
    }
    if (changed) {
      updateLevels(nextLevels);
    }
  }

  let nodeById = new Map<string, TreeNode>();
  $: nodeById = new Map(nodes.map((node) => [node.id, node]));

  $: rootNode = nodes.find((node) => node.id === "root");
  $: regularNodes = nodes.filter((node) => node.id !== "root");

  const links = () => {
    const regularLinks = regularNodes.flatMap((node) =>
      (node.parentIds ?? []).map((parentId) => ({
        from: parentId,
        to: node.id,
      })),
    );
    // Link nodes without parentIds to root
    const rootLinks = regularNodes
      .filter((node) => !node.parentIds || node.parentIds.length === 0)
      .map((node) => ({
        from: "root",
        to: node.id,
      }));
    return [...regularLinks, ...rootLinks];
  };

  function getLevelFrom(levelsSnapshot: Record<string, number>, id: string) {
    return levelsSnapshot[id] ?? 0;
  }

  function getLevel(id: string) {
    return getLevelFrom(levels, id);
  }

  function isAvailable(node: TreeNode, levelsSnapshot: Record<string, number>) {
    // Nodes without parentIds are linked to root, which is always available
    if (!node.parentIds || node.parentIds.length === 0) return true;
    return node.parentIds.every(
      (parentId) => {
        // Root is always considered "available" for linking purposes
        if (parentId === "root") return true;
        return getLevelFrom(levelsSnapshot, parentId) > 0;
      },
    );
  }

  function getState(
    node: TreeNode,
    levelsSnapshot: Record<string, number>,
  ): NodeState {
    const level = getLevelFrom(levelsSnapshot, node.id);
    if (level >= node.maxLevel) return "maxed";
    if (level > 0) return "active";
    if (isAvailable(node, levelsSnapshot)) return "available";
    return "locked";
  }

  function levelUp(id: string) {
    if (id === "root") return false; // Root cannot be leveled up
    const node = nodeById.get(id);
    if (!node) return false;
    const state = getState(node, levels);
    if (state === "locked") return false;
    const level = getLevel(id);
    const nextLevel = Math.min(level + 1, node.maxLevel);
    if (nextLevel === level) return false;
    updateLevels({ ...levels, [id]: nextLevel });
    onNodeLevelChange?.(1, id);
    return true;
  }

  function levelDown(id: string) {
    const level = getLevel(id);
    if (level === 0) return;
    const nextLevel = level - 1;
    updateLevels({ ...levels, [id]: nextLevel });
    onNodeLevelChange?.(-1, id);
  }

  function resetNode(id: string) {
    const level = getLevel(id);
    if (level === 0) return;
    updateLevels({ ...levels, [id]: 0 });
    onNodeLevelChange?.(-level, id);
  }

  function maxNode(id: string) {
    const node = nodeById.get(id);
    if (!node) return;
    if (getState(node, levels) === "locked") return;
    const level = getLevel(id);
    if (level >= node.maxLevel) return;
    updateLevels({ ...levels, [id]: node.maxLevel });
    onNodeLevelChange?.(node.maxLevel - level, id);
  }

  export function resetAllNodes() {
    const totalSpent = Object.values(levels).reduce(
      (sum, value) => sum + value,
      0,
    );
    updateLevels(Object.fromEntries(nodes.map((node) => [node.id, 0])));
    if (totalSpent > 0) {
      onNodeLevelChange?.(-totalSpent, "all");
    }
  }

  export function getViewState() {
    return { offsetX, offsetY, scale };
  }

  export function setViewState(view: TreeViewState | null) {
    if (!view) return;
    scale = clamp(view.scale, minScale, maxScale);
    offsetX = view.offsetX;
    offsetY = view.offsetY;
    if (viewportEl) {
      const clamped = clampOffsets(offsetX, offsetY, scale);
      offsetX = clamped.x;
      offsetY = clamped.y;
    }
  }

  export function triggerFade() {
    fadeKey += 1;
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function isInContextMenu(target: EventTarget | null) {
    return target instanceof Element && !!target.closest(".context-menu");
  }

  function cancelActiveGestures() {
    if (viewportEl) {
      for (const pointerId of pointers.keys()) {
        viewportEl.releasePointerCapture(pointerId);
      }
    }
    pointers.clear();
    panStart = null;
    pinchStart = null;
    primaryPointerId = null;
    primaryStart = null;
    panActive = false;
  }

  export function cancelGestures() {
    cancelActiveGestures();
  }

  function startNodeLongPress(pointerId: number) {
    startLongPress(longPressState, () => {
      const pointer = pointers.get(pointerId);
      if (!pointer || panActive || pointers.size !== 1) return false;
      if (!pointer.nodeId) return false;
      suppressTooltip(pointerId);
      hideTooltip();
      contextMenu = { id: pointer.nodeId, x: pointer.x, y: pointer.y };
      cancelActiveGestures();
      return true;
    });
  }

  function getNodeIdFromTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    const nodeEl = target.closest("[data-node-id]");
    return nodeEl?.getAttribute("data-node-id") ?? null;
  }

  function onContextMenu(event: MouseEvent) {
    if (gesturesDisabled) return;
    const nodeId = getNodeIdFromTarget(event.target);
    if (!nodeId || nodeId === "root") return; // Root cannot have context menu
    event.preventDefault();
    hideTooltip();
    contextMenu = { id: nodeId, x: event.clientX, y: event.clientY };
    cancelActiveGestures();
  }

  function isPrimaryPointer(event: PointerEvent) {
    if (event.pointerType === "mouse") {
      return event.button === 0;
    }
    return true;
  }

  function onPointerDown(event: PointerEvent) {
    if (!viewportEl) return;
    if (gesturesDisabled) return;
    if (event.pointerType === "mouse" && event.button === 1) {
      const nodeId = getNodeIdFromTarget(event.target);
      if (!nodeId) {
        event.preventDefault();
        focusTreeInView();
        return;
      }
    }
    if (!isPrimaryPointer(event)) return;
    if (contextMenu) {
      if (isInContextMenu(event.target)) return;
      closeContextMenu();
      cancelActiveGestures();
      return;
    }
    viewportEl.setPointerCapture(event.pointerId);
    const nodeId = getNodeIdFromTarget(event.target);
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      nodeId,
    });
    longPressState.fired = false;

    if (pointers.size === 1) {
      primaryPointerId = event.pointerId;
      primaryStart = { x: event.clientX, y: event.clientY, nodeId };
      panActive = false;
      panStart = {
        x: event.clientX,
        y: event.clientY,
        offsetX,
        offsetY,
      };
      if (nodeId) {
        startNodeLongPress(event.pointerId);
      }
    } else if (pointers.size === 2) {
      clearLongPress(longPressState);
      longPressState.fired = false;
      const [p1, p2] = Array.from(pointers.values());
      const centerX = (p1.x + p2.x) / 2;
      const centerY = (p1.y + p2.y) / 2;
      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const world = screenToWorld(centerX, centerY);
      pinchStart = { distance, worldX: world.x, worldY: world.y, scale };
      panStart = null;
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (gesturesDisabled) return;
    if (!pointers.has(event.pointerId)) return;
    const pointer = pointers.get(event.pointerId)!;
    pointers.set(event.pointerId, {
      ...pointer,
      x: event.clientX,
      y: event.clientY,
    });

    if (
      pointers.size === 1 &&
      panStart &&
      primaryPointerId === event.pointerId
    ) {
      const dxTotal = event.clientX - (primaryStart?.x ?? event.clientX);
      const dyTotal = event.clientY - (primaryStart?.y ?? event.clientY);
      const distance = Math.hypot(dxTotal, dyTotal);
      if (!panActive && distance > LONG_PRESS_MOVE_THRESHOLD) {
        panActive = true;
        clearLongPress(longPressState);
      }

      if (panActive) {
        const dx = event.clientX - panStart.x;
        const dy = event.clientY - panStart.y;
        const nextOffsetX = panStart.offsetX + dx;
        const nextOffsetY = panStart.offsetY + dy;
        const clamped = clampOffsets(nextOffsetX, nextOffsetY, scale);
        offsetX = clamped.x;
        offsetY = clamped.y;
      }
      return;
    }

    if (pointers.size === 2 && pinchStart) {
      clearLongPress(longPressState);
      panActive = false;
      const [p1, p2] = Array.from(pointers.values());
      const centerX = (p1.x + p2.x) / 2;
      const centerY = (p1.y + p2.y) / 2;
      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const nextScale = clamp(
        pinchStart.scale * (distance / pinchStart.distance),
        minScale,
        maxScale,
      );
      scale = nextScale;
      const nextOffsetX = centerX - pinchStart.worldX * scale;
      const nextOffsetY = centerY - pinchStart.worldY * scale;
      const clamped = clampOffsets(nextOffsetX, nextOffsetY, nextScale);
      offsetX = clamped.x;
      offsetY = clamped.y;
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (!isPrimaryPointer(event)) return;
    if (viewportEl) {
      viewportEl.releasePointerCapture(event.pointerId);
    }
    const pointer = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    clearLongPress(longPressState);

    if (
      pointer &&
      event.pointerId === primaryPointerId &&
      !panActive &&
      !longPressState.fired &&
      pointers.size === 0 &&
      pointer.nodeId
    ) {
      if (levelUp(pointer.nodeId)) {
        onNodeLevelUp?.(pointer.nodeId);
      }
    }

    if (pointers.size === 1) {
      const remainingId = Array.from(pointers.keys())[0];
      const remaining = Array.from(pointers.values())[0];
      primaryPointerId = remainingId;
      primaryStart = {
        x: remaining.x,
        y: remaining.y,
        nodeId: remaining.nodeId,
      };
      panActive = false;
      panStart = {
        x: remaining.x,
        y: remaining.y,
        offsetX,
        offsetY,
      };
      pinchStart = null;
    } else if (pointers.size === 0) {
      panStart = null;
      pinchStart = null;
      primaryPointerId = null;
      primaryStart = null;
      panActive = false;
      longPressState.fired = false;
    }
  }

  function screenToWorld(x: number, y: number) {
    return { x: (x - offsetX) / scale, y: (y - offsetY) / scale };
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function computeFocusViewState(): TreeViewState | null {
    if (!viewportEl || nodes.length === 0) return null;
    const maxRadius = Math.max(...nodes.map((node) => (node.radius ?? 1) * 64));
    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX + maxRadius;
    const height = maxY - minY + maxRadius;
    const rect = viewportEl.getBoundingClientRect();
    const padding = 24;
    const availableW = Math.max(rect.width - padding * 2, 1);
    const availableH = Math.max(rect.height - bottomInset - padding * 2, 1);
    const paddedCenterX = padding + availableW / 2;
    const paddedCenterY = padding + availableH / 2;
    const nextScale = clamp(
      Math.min(availableW / width, availableH / height),
      minScale,
      maxScale,
    );
    const nextOffsetX = paddedCenterX - (minX + width / 2) * nextScale;
    const nextOffsetY = paddedCenterY - (minY + height / 2) * nextScale;
    const clamped = clampOffsets(nextOffsetX, nextOffsetY, nextScale);
    return { offsetX: clamped.x, offsetY: clamped.y, scale: nextScale };
  }

  function getWorldBounds() {
    if (nodes.length === 0) return null;
    const maxRadius = Math.max(...nodes.map((node) => (node.radius ?? 1) * 64));
    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + maxRadius;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + maxRadius;
    return { minX, maxX, minY, maxY };
  }

  function clampOffsets(
    nextOffsetX: number,
    nextOffsetY: number,
    nextScale = scale,
  ) {
    if (!viewportEl) return { x: nextOffsetX, y: nextOffsetY };
    const bounds = getWorldBounds();
    if (!bounds) return { x: nextOffsetX, y: nextOffsetY };

    const rect = viewportEl.getBoundingClientRect();
    const padding = 24;
    const usableHeight = Math.max(rect.height - bottomInset, 1);
    const paddedRight = rect.width - padding;
    const paddedBottom = Math.max(usableHeight - padding, padding);

    const centerWorldX = (bounds.minX + bounds.maxX) / 2;
    const centerWorldY = (bounds.minY + bounds.maxY) / 2;
    const centerScreenX = nextOffsetX + centerWorldX * nextScale;
    const centerScreenY = nextOffsetY + centerWorldY * nextScale;

    const clampedCenterX = clamp(centerScreenX, padding, paddedRight);
    const clampedCenterY = clamp(centerScreenY, padding, paddedBottom);

    return {
      x: nextOffsetX + (clampedCenterX - centerScreenX),
      y: nextOffsetY + (clampedCenterY - centerScreenY),
    };
  }

  function onWheel(event: WheelEvent) {
    if (gesturesDisabled) return;
    if (!viewportEl) return;
    if (pointers.size > 0) return;
    const rect = viewportEl.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const world = screenToWorld(localX, localY);
    const zoomFactor = Math.exp(-event.deltaY * 0.002);
    const nextScale = clamp(scale * zoomFactor, minScale, maxScale);
    scale = nextScale;
    const nextOffsetX = localX - world.x * scale;
    const nextOffsetY = localY - world.y * scale;
    const clamped = clampOffsets(nextOffsetX, nextOffsetY, nextScale);
    offsetX = clamped.x;
    offsetY = clamped.y;
  }

  export function focusTreeInView(announce = false) {
    const next = computeFocusViewState();
    if (!next) return false;
    offsetX = next.offsetX;
    offsetY = next.offsetY;
    scale = next.scale;
    if (announce) {
      showToast("Focused tree in view");
    }
    return true;
  }

  export function getFocusViewState() {
    return focusViewState ?? computeFocusViewState();
  }

  let resizeObserver: ResizeObserver | null = null;

  // Set up ResizeObserver when viewportEl is available
  $: if (viewportEl && typeof ResizeObserver !== 'undefined') {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    resizeObserver = new ResizeObserver(() => {
      if (viewportEl) {
        const rect = viewportEl.getBoundingClientRect();
        viewportSize = { width: rect.width, height: rect.height };
      }
    });
    resizeObserver.observe(viewportEl);
  } else if (!viewportEl && resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  onMount(() => {
    const initializeView = async () => {
      await tick();
      if (initialViewState) {
        setViewState(initialViewState);
        return;
      }
      if (!focusTreeInView()) {
        requestAnimationFrame(() => {
          focusTreeInView();
        });
      }
    };
    void initializeView();
    const handleResize = () => {
      if (viewportEl) {
        const rect = viewportEl.getBoundingClientRect();
        viewportSize = { width: rect.width, height: rect.height };
      }
      focusTreeInView();
    };
    window.addEventListener("resize", handleResize, { passive: true });
    
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    };
  });

  $: if (gesturesDisabled) {
    cancelActiveGestures();
  }

  $: {
    focusViewState = computeFocusViewState();
    onFocusViewStateChange?.(focusViewState);
  }

  $: onViewStateChange?.({ offsetX, offsetY, scale });
</script>

{#key fadeKey}
  <div class="tree-root" in:fade={{ duration: 300 }}>
    <div
      class="tree-viewport"
      class:pan-enabled={!gesturesDisabled}
      bind:this={viewportEl}
      role="presentation"
      on:contextmenu={onContextMenu}
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
      on:pointercancel={onPointerUp}
      on:pointerleave={onPointerUp}
      on:wheel|passive={onWheel}
    >
      <div
        class="tree-canvas"
        style={`transform: translate(${offsetX}px, ${offsetY}px) scale(${scale});`}
      >
        <svg class="tree-links">
          {#each links() as link}
            {#if (link.from === "root" || nodeById.has(link.from)) && nodeById.has(link.to)}
              {@const from = link.from === "root" ? rootNode! : nodeById.get(link.from)!}
              {@const to = nodeById.get(link.to)!}
              {@const fromRadius = (from.radius ?? 1) * 32}
              {@const toRadius = (to.radius ?? 1) * 32}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                class:link-active={link.from === "root" || getLevelFrom(levels, link.from) > 0}
              />
            {/if}
          {/each}
        </svg>

        {#if rootNode}
          {@const rootRadius = rootNode.radius ?? 1}
          {@const rootSize = 64 * rootRadius}
          <div
            class="root-wrapper"
            style={`left: ${rootNode.x}px; top: ${rootNode.y}px; width: ${rootSize}px; height: ${rootSize}px; --node-radius: ${rootRadius};`}
          >
            <RootNode />
          </div>
        {/if}

        {#each regularNodes as node}
          {@const level = getLevelFrom(levels, node.id)}
          {@const state = getState(node, levels)}
          <div
            class="node-wrapper"
            style={`left: ${node.x}px; top: ${node.y}px;`}
          >
            <Node
              id={node.id}
              label={node.label ?? ""}
              {level}
              maxLevel={node.maxLevel}
              {state}
              radius={node.radius ?? 1}
              scale={scale}
            />
          </div>
        {/each}
      </div>

      <NodeContentMenu
        nodeId={contextMenu?.id ?? ""}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        isOpen={!!contextMenu}
        onClose={closeContextMenu}
        onMax={maxNode}
        onReset={resetNode}
        onDecrement={levelDown}
        onIncrement={levelUp}
        level={contextMenu?.id ? getLevelFrom(levels, contextMenu.id) : 0}
        maxLevel={contextMenu?.id && nodeById.has(contextMenu.id) ? nodeById.get(contextMenu.id)!.maxLevel : 0}
        state={contextMenu?.id ? getState(nodeById.get(contextMenu.id)!, levels) : "locked"}
      />
    </div>
  </div>
{/key}

<style>
  .tree-root {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tree-viewport {
    position: relative;
    flex: 1;
    overflow: hidden;
    touch-action: none;
    overscroll-behavior: none;
  }

  .tree-viewport.pan-enabled {
    cursor: grab;
  }

  .tree-viewport.pan-enabled:active {
    cursor: grabbing;
  }

  .tree-canvas {
    position: absolute;
    inset: 0;
    transform-origin: 0 0;
  }

  .tree-links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .tree-links line {
    stroke: rgba(88, 110, 160, 0.5);
    stroke-width: 2;
  }

  .tree-links line.link-active {
    stroke: rgba(255, 179, 71, 0.8);
  }

  .root-wrapper {
    position: absolute;
    transform: translate(-50%, -50%);
  }

  .node-wrapper {
    position: absolute;
    transform: translate(-50%, -50%);
  }
</style>
