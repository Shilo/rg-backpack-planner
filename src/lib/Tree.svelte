<script lang="ts" context="module">
  import type { Node as NodeType } from "../types/tree";

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
  import { closeUpView } from "./closeUpViewStore";
  import { singleLevelUp } from "./singleLevelUpStore";
  import type { LevelsByIndex, Link, NodeIndex } from "../types/tree";

  export let nodes: NodeType[] = [];
  export let bottomInset = 0;
  export let gesturesDisabled = false;
  export let initialViewState: TreeViewState | null = null;
  export let onNodeLevelChange:
    | ((delta: number, nodeIndex?: NodeIndex) => void)
    | null = null;
  export let levelsById: LevelsByIndex | null = null;
  export let onLevelsChange: ((levels: LevelsByIndex) => void) | null = null;
  export let onViewStateChange: ((view: TreeViewState) => void) | null = null;
  export let onFocusViewStateChange:
    | ((view: TreeViewState | null) => void)
    | null = null;
  export let onOpenTreeContextMenu: ((x: number, y: number) => void) | null =
    null;

  let levels: LevelsByIndex = [];
  let contextMenu: { index: NodeIndex | null; x: number; y: number } | null =
    null;

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
    const padding = 10;
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
    nodeIndex: NodeIndex | null;
    isRoot: boolean;
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
  let primaryStart: {
    x: number;
    y: number;
    nodeIndex: NodeIndex | null;
    isRoot: boolean;
  } | null = null;

  const longPressState: LongPressState = { timer: null, fired: false };
  let fadeKey = 0;

  function updateLevels(nextLevels: LevelsByIndex) {
    levels = nextLevels;
    onLevelsChange?.(nextLevels);
  }

  $: if (levelsById) {
    // Copy from external prop; clamp/pad to match node count
    const next: LevelsByIndex = nodes.map((_, i) => levelsById[i] ?? 0);
    levels = next;
  } else {
    // Ensure levels array matches node count
    const next: LevelsByIndex = nodes.map((_, i) => levels[i] ?? 0);
    if (next.length !== levels.length || next.some((v, i) => v !== levels[i])) {
      levels = next;
    }
  }

  function getNodeAt(index: NodeIndex): NodeType | null {
    return index >= 0 && index < nodes.length ? nodes[index] : null;
  }

  function parentIndices(node: NodeType): number[] {
    const p = node.parent;
    if (p === undefined) return [];
    return Array.isArray(p) ? p : [p];
  }

  /** Links: parent→child. Parentless nodes link to (0,0); from omitted. */
  const links = (): Link[] => {
    const out: Link[] = [];
    nodes.forEach((node, i) => {
      const parents = parentIndices(node);
      const to = i;
      if (parents.length === 0) {
        out.push({ to });
      } else {
        parents.forEach((pi) => out.push({ from: pi, to }));
      }
    });
    return out;
  };

  function hasChildren(index: NodeIndex): boolean {
    return nodes.some((node) => parentIndices(node).includes(index));
  }

  function isLeafNode(node: NodeType, index: number): boolean {
    const parents = parentIndices(node);
    return parents.length > 0 && !hasChildren(index);
  }

  function getLevelFrom(levelsSnapshot: LevelsByIndex, index: NodeIndex) {
    return levelsSnapshot[index] ?? 0;
  }

  function getLevel(index: NodeIndex) {
    return getLevelFrom(levels, index);
  }

  function isAvailable(
    node: NodeType,
    index: number,
    levelsSnapshot: LevelsByIndex,
  ): boolean {
    const parents = parentIndices(node);
    if (parents.length === 0) return true;
    return parents.every((pi) => getLevelFrom(levelsSnapshot, pi) > 0);
  }

  function getState(
    node: NodeType,
    index: number,
    levelsSnapshot: LevelsByIndex,
  ): NodeState {
    const level = getLevelFrom(levelsSnapshot, index);
    if (level >= node.maxLevel) return "maxed";
    if (level > 0) return "active";
    if (isAvailable(node, index, levelsSnapshot)) return "available";
    return "locked";
  }

  type NodeRegion = "top-left" | "bottom-left" | "right";

  let regionCache = new Map<number, NodeRegion>();

  function getBaseRegionFromPosition(node: NodeType): NodeRegion {
    if (node.x > 0) return "right";
    if (node.y < 0) return "top-left";
    return "bottom-left";
  }

  function getNodeRegion(node: NodeType, index: number): NodeRegion {
    if (regionCache.has(index)) {
      return regionCache.get(index)!;
    }

    const parents = parentIndices(node);
    if (parents.length === 0) {
      const region = getBaseRegionFromPosition(node);
      regionCache.set(index, region);
      return region;
    }

    for (const pi of parents) {
      const parent = getNodeAt(pi);
      if (!parent) continue;
      const parentRegion = getNodeRegion(parent, pi);
      regionCache.set(index, parentRegion);
      return parentRegion;
    }

    const region = getBaseRegionFromPosition(node);
    regionCache.set(index, region);
    return region;
  }

  $: {
    regionCache.clear();
    nodes.forEach((node, i) => getNodeRegion(node, i));
  }

  function getLinkColor(
    to: NodeType,
    toIndex: number,
    isActive: boolean,
  ): string {
    const toRegion = getNodeRegion(to, toIndex);
    const opacity = isActive ? 0.8 : 0.4;

    // Use the target node's region color for the link
    // Colorblind-friendly: Orange (more red-orange), Yellow (bright gold), Blue (saturated)
    if (toRegion === "top-left") return `rgba(255, 107, 53, ${opacity})`; // Red-orange
    if (toRegion === "bottom-left") return `rgba(255, 215, 0, ${opacity})`; // Bright gold
    return `rgba(74, 144, 226, ${opacity})`; // Saturated blue
  }

  function levelUp(index: NodeIndex) {
    const node = getNodeAt(index);
    if (!node) return false;
    const level = getLevel(index);
    const nextLevel = Math.min(level + 1, node.maxLevel);
    if (nextLevel === level) return false;
    const nextLevels = levels.slice();
    nextLevels[index] = nextLevel;
    updateLevels(nextLevels);
    onNodeLevelChange?.(1, index);

    levelZeroParents(index);
    return true;
  }

  function levelZeroParents(index: NodeIndex) {
    const node = getNodeAt(index);
    if (!node) return;
    const parents = parentIndices(node);
    for (const pi of parents) {
      const parentNode = getNodeAt(pi);
      if (!parentNode) continue;
      const parentLevel = getLevel(pi);
      if (parentLevel === 0) {
        const nextLevel = Math.min(1, parentNode.maxLevel);
        if (nextLevel > 0) {
          const nextLevels = levels.slice();
          nextLevels[pi] = nextLevel;
          updateLevels(nextLevels);
          onNodeLevelChange?.(1, pi);
          levelZeroParents(pi);
        }
      }
    }
  }

  function levelDown(index: NodeIndex) {
    const level = getLevel(index);
    if (level === 0) return;
    const nextLevels = levels.slice();
    nextLevels[index] = level - 1;
    updateLevels(nextLevels);
    onNodeLevelChange?.(-1, index);
  }

  function resetNode(index: NodeIndex) {
    const level = getLevel(index);
    if (level === 0) return;
    const nextLevels = levels.slice();
    nextLevels[index] = 0;
    updateLevels(nextLevels);
    onNodeLevelChange?.(-level, index);
  }

  function maxNode(index: NodeIndex) {
    const node = getNodeAt(index);
    if (!node) return;
    const level = getLevel(index);
    if (level >= node.maxLevel) return;
    const nextLevels = levels.slice();
    nextLevels[index] = node.maxLevel;
    updateLevels(nextLevels);
    onNodeLevelChange?.(node.maxLevel - level, index);
    levelZeroParents(index);
  }

  export function resetAllNodes() {
    const totalSpent = levels.reduce((sum, value) => sum + value, 0);
    updateLevels(nodes.map(() => 0));
    if (totalSpent > 0) {
      onNodeLevelChange?.(-totalSpent);
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
      if (pointer.nodeIndex === null || pointer.isRoot) return false;
      suppressTooltip(pointerId);
      hideTooltip();
      contextMenu = { index: pointer.nodeIndex, x: pointer.x, y: pointer.y };
      cancelActiveGestures();
      return true;
    });
  }

  function getNodeInfoFromTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    const nodeEl = target.closest("[data-node-id]");
    const attr = nodeEl?.getAttribute("data-node-id");
    if (!attr) return null;
    if (attr === "root") {
      return { index: null as NodeIndex | null, isRoot: true };
    }
    const parsed = Number(attr);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return null;
    }
    return { index: parsed as NodeIndex, isRoot: false };
  }

  function onContextMenu(event: MouseEvent) {
    if (gesturesDisabled) return;
    const info = getNodeInfoFromTarget(event.target);
    if (!info || info.isRoot || info.index === null) return;
    event.preventDefault();
    hideTooltip();
    contextMenu = { index: info.index, x: event.clientX, y: event.clientY };
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
      const info = getNodeInfoFromTarget(event.target);
      if (!info || info.index === null) {
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
    const info = getNodeInfoFromTarget(event.target);
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      nodeIndex: info?.index ?? null,
      isRoot: info?.isRoot ?? false,
    });
    longPressState.fired = false;

    if (pointers.size === 1) {
      primaryPointerId = event.pointerId;
      primaryStart = {
        x: event.clientX,
        y: event.clientY,
        nodeIndex: info?.index ?? null,
        isRoot: info?.isRoot ?? false,
      };
      panActive = false;
      panStart = {
        x: event.clientX,
        y: event.clientY,
        offsetX,
        offsetY,
      };
      if (info && !info.isRoot && info.index !== null) {
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
      pointers.size === 0
    ) {
      if (pointer.isRoot) {
        if (onOpenTreeContextMenu) {
          onOpenTreeContextMenu(event.clientX, event.clientY);
        } else {
          focusTreeInView(true);
        }
      } else if (pointer.nodeIndex !== null) {
        // Check single level-up setting: if enabled, increment by 1; if disabled, max the node
        $singleLevelUp
          ? levelUp(pointer.nodeIndex)
          : maxNode(pointer.nodeIndex);
      }
    }

    if (pointers.size === 1) {
      const remainingId = Array.from(pointers.keys())[0];
      const remaining = Array.from(pointers.values())[0];
      primaryPointerId = remainingId;
      primaryStart = {
        x: remaining.x,
        y: remaining.y,
        nodeIndex: remaining.nodeIndex,
        isRoot: remaining.isRoot,
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
    const rect = viewportEl.getBoundingClientRect();
    // Ensure viewport has valid dimensions
    if (rect.width <= 0 || rect.height <= 0) return null;
    // Since nodes are centered, we need to account for radius on all sides
    const nodeBounds = nodes.map((node) => {
      const radius = (node.radius ?? 1) * 32; // Half the node size
      return {
        minX: node.x - radius,
        maxX: node.x + radius,
        minY: node.y - radius,
        maxY: node.y + radius,
      };
    });
    const minX = Math.min(...nodeBounds.map((b) => b.minX));
    const maxX = Math.max(...nodeBounds.map((b) => b.maxX));
    const minY = Math.min(...nodeBounds.map((b) => b.minY));
    const maxY = Math.max(...nodeBounds.map((b) => b.maxY));
    const width = maxX - minX;
    const height = maxY - minY;
    const padding = 10;
    const availableW = Math.max(rect.width - padding * 2, 1);
    const availableH = Math.max(rect.height - bottomInset - padding * 2, 1);
    const paddedCenterX = padding + availableW / 2;
    const paddedCenterY = padding + availableH / 2;
    // Calculate scale needed to fit all nodes in viewport (old behavior, always 100% base)
    const fitScale = Math.min(availableW / width, availableH / height);
    // If close-up view is enabled, multiply the scale by 1.5; otherwise use the fit scale as-is
    const nextScale = clamp(
      $closeUpView ? fitScale * 1.5 : fitScale,
      minScale,
      maxScale,
    );
    const centerX = $closeUpView ? 0 : minX + width / 2;
    const centerY = $closeUpView ? 0 : minY + height / 2;
    const nextOffsetX = paddedCenterX - centerX * nextScale;
    const nextOffsetY = paddedCenterY - centerY * nextScale;
    const clamped = clampOffsets(nextOffsetX, nextOffsetY, nextScale);
    return { offsetX: clamped.x, offsetY: clamped.y, scale: nextScale };
  }

  function getWorldBounds() {
    if (nodes.length === 0) return null;
    // Since nodes are centered, we need to account for radius on all sides
    const nodeBounds = nodes.map((node) => {
      const radius = (node.radius ?? 1) * 32; // Half the node size
      return {
        minX: node.x - radius,
        maxX: node.x + radius,
        minY: node.y - radius,
        maxY: node.y + radius,
      };
    });
    const minX = Math.min(...nodeBounds.map((b) => b.minX));
    const maxX = Math.max(...nodeBounds.map((b) => b.maxX));
    const minY = Math.min(...nodeBounds.map((b) => b.minY));
    const maxY = Math.max(...nodeBounds.map((b) => b.maxY));
    return { minX, maxX, minY, maxY };
  }

  function clampOffsets(
    nextOffsetX: number,
    nextOffsetY: number,
    nextScale = scale,
  ) {
    if (!viewportEl) return { x: nextOffsetX, y: nextOffsetY };

    const rect = viewportEl.getBoundingClientRect();
    const usableHeight = Math.max(rect.height - bottomInset, 1);

    // Scale bounds with zoom level - only expand when zoomed in (scale >= 1)
    const effectiveScale = Math.max(nextScale, 1);
    const minOffsetX = -rect.width * (effectiveScale - 1);
    const maxOffsetX = rect.width * effectiveScale;
    const minOffsetY = -usableHeight * (effectiveScale - 1);
    const maxOffsetY = usableHeight * effectiveScale;

    return {
      x: clamp(nextOffsetX, minOffsetX, maxOffsetX),
      y: clamp(nextOffsetY, minOffsetY, maxOffsetY),
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
  $: if (viewportEl && typeof ResizeObserver !== "undefined") {
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
    // Set up callback for close-up view changes to trigger focus without toast
    closeUpView.setOnChange(() => {
      focusTreeInView(false);
    });
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
      closeUpView.setOnChange(null);
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
            {@const fromNode =
              link.from === undefined ? null : getNodeAt(link.from)}
            {@const toNode = getNodeAt(link.to)}
            {#if toNode}
              {@const toIndex = link.to}
              {@const isActive =
                link.from === undefined ||
                (link.from !== undefined &&
                  getLevelFrom(levels, link.from) > 0)}
              {@const linkColor = getLinkColor(toNode, toIndex, isActive)}
              <line
                x1={fromNode ? fromNode.x : 0}
                y1={fromNode ? fromNode.y : 0}
                x2={toNode.x}
                y2={toNode.y}
                style={`stroke: ${linkColor};`}
              />
            {/if}
          {/each}
        </svg>

        <RootNode
          {onOpenTreeContextMenu}
          onFocusView={() => focusTreeInView(true)}
        />

        {#each nodes as node, i}
          {@const level = getLevelFrom(levels, i)}
          {@const state = getState(node, i, levels)}
          {@const region = getNodeRegion(node, i)}
          {@const isLeaf = isLeafNode(node, i)}
          <Node
            id={i}
            x={node.x}
            y={node.y}
            label={node.skillId}
            {level}
            {state}
            radius={node.radius ?? 1}
            {scale}
            {region}
            {isLeaf}
          />
        {/each}
      </div>

      <NodeContentMenu
        nodeIndex={contextMenu?.index ?? null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        isOpen={!!contextMenu}
        onClose={closeContextMenu}
        onMax={maxNode}
        onReset={resetNode}
        onDecrement={levelDown}
        onIncrement={levelUp}
        level={contextMenu && contextMenu.index !== null
          ? getLevelFrom(levels, contextMenu.index)
          : 0}
        maxLevel={contextMenu &&
        contextMenu.index !== null &&
        getNodeAt(contextMenu.index)
          ? getNodeAt(contextMenu.index)!.maxLevel
          : 0}
        state={contextMenu &&
        contextMenu.index !== null &&
        getNodeAt(contextMenu.index)
          ? getState(getNodeAt(contextMenu.index)!, contextMenu.index, levels)
          : "locked"}
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
    stroke-width: 2;
    transition: stroke-opacity 0.2s;
  }
</style>
