<script lang="ts" context="module">
  export type TreeNode = {
    id: string;
    x: number;
    y: number;
    maxLevel: number;
    label?: string;
    parentIds?: string[];
  };
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import Node, { type NodeState } from "./Node.svelte";
  import NodeContentMenu from "./NodeContentMenu.svelte";
  import {
    LONG_PRESS_MOVE_THRESHOLD,
    clearLongPress,
    startLongPress,
    type LongPressState,
  } from "./longPress";
  import { hideTooltip, suppressTooltip } from "./tooltip";

  export let nodes: TreeNode[] = [];
  export let bottomInset = 0;
  export let gesturesDisabled = false;

  let levels: Record<string, number> = {};
  let contextMenu: { id: string; x: number; y: number } | null = null;

  let viewportEl: HTMLDivElement | null = null;

  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;

  const minScale = 0.6;
  const maxScale = 2.2;

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

  $: {
    for (const node of nodes) {
      if (!(node.id in levels)) {
        levels = { ...levels, [node.id]: 0 };
      }
    }
  }

  let nodeById = new Map<string, TreeNode>();
  $: nodeById = new Map(nodes.map((node) => [node.id, node]));

  const links = () =>
    nodes.flatMap((node) =>
      (node.parentIds ?? []).map((parentId) => ({
        from: parentId,
        to: node.id,
      })),
    );

  function getLevel(id: string) {
    return levels[id] ?? 0;
  }

  function isAvailable(node: TreeNode) {
    if (!node.parentIds || node.parentIds.length === 0) return true;
    return node.parentIds.every((parentId) => getLevel(parentId) > 0);
  }

  function getState(node: TreeNode): NodeState {
    const level = getLevel(node.id);
    if (level >= node.maxLevel) return "maxed";
    if (level > 0) return "active";
    if (isAvailable(node)) return "available";
    return "locked";
  }

  function levelUp(id: string) {
    const node = nodeById.get(id);
    if (!node) return;
    const state = getState(node);
    if (state === "locked") return;
    const level = getLevel(id);
    levels = { ...levels, [id]: Math.min(level + 1, node.maxLevel) };
  }

  function resetNode(id: string) {
    levels = { ...levels, [id]: 0 };
  }

  function maxNode(id: string) {
    const node = nodeById.get(id);
    if (!node) return;
    if (getState(node) === "locked") return;
    levels = { ...levels, [id]: node.maxLevel };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function isInContextMenu(target: EventTarget | null) {
    return target instanceof HTMLElement && !!target.closest(".context-menu");
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
    if (!(target instanceof HTMLElement)) return null;
    const nodeEl = target.closest("[data-node-id]");
    return nodeEl?.getAttribute("data-node-id") ?? null;
  }

  function onPointerDown(event: PointerEvent) {
    if (!viewportEl) return;
    if (gesturesDisabled) return;
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
        offsetX = panStart.offsetX + dx;
        offsetY = panStart.offsetY + dy;
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
      offsetX = centerX - pinchStart.worldX * scale;
      offsetY = centerY - pinchStart.worldY * scale;
    }
  }

  function onPointerUp(event: PointerEvent) {
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
      levelUp(pointer.nodeId);
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
    offsetX = localX - world.x * scale;
    offsetY = localY - world.y * scale;
  }

  export function centerTree() {
    if (!viewportEl || nodes.length === 0) return;
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
    const paddedCenterX = padding + availableW / 2;
    const paddedCenterY = padding + availableH / 2;
    scale = clamp(
      Math.min(availableW / width, availableH / height),
      minScale,
      maxScale,
    );
    offsetX = paddedCenterX - (minX + width / 2) * scale;
    offsetY = paddedCenterY - (minY + height / 2) * scale;
    const paddedOffsetX = paddedCenterX - (minX + width / 2) * scale;
    const paddedOffsetY = paddedCenterY - (minY + height / 2) * scale;
  }

  onMount(() => {
    centerTree();
    const handleResize = () => {
      centerTree();
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  $: if (viewportEl) {
    centerTree();
  }

  $: if (gesturesDisabled) {
    cancelActiveGestures();
  }
</script>

<div class="tree-root">
  <div
    class="tree-viewport"
    bind:this={viewportEl}
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
          {#if nodeById.has(link.from) && nodeById.has(link.to)}
            {@const from = nodeById.get(link.from)!}
            {@const to = nodeById.get(link.to)!}
            <line
              x1={from.x + 32}
              y1={from.y + 32}
              x2={to.x + 32}
              y2={to.y + 32}
              class:link-active={getLevel(link.from) > 0}
            />
          {/if}
        {/each}
      </svg>

      {#each nodes as node}
        <div
          class="node-wrapper"
          style={`left: ${node.x}px; top: ${node.y}px;`}
        >
          <Node
            id={node.id}
            label={node.label ?? ""}
            level={getLevel(node.id)}
            maxLevel={node.maxLevel}
            state={getState(node)}
          />
        </div>
      {/each}
    </div>

    <NodeContentMenu
      nodeId={contextMenu?.id ?? null}
      x={contextMenu?.x ?? 0}
      y={contextMenu?.y ?? 0}
      isOpen={!!contextMenu}
      onClose={closeContextMenu}
      onMax={maxNode}
      onReset={resetNode}
    />
  </div>
</div>

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

  .node-wrapper {
    position: absolute;
  }
</style>
