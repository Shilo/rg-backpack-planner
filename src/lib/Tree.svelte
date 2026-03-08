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
        suppressNextPointerUp,
        type LongPressState,
    } from "./longPress";
    import { triggerHaptic } from "./hapticsStore";
    import { showToast } from "./toast";
    import { hideTooltip, suppressTooltip } from "./tooltip";
    import {
        treeZoomScale,
        TreeZoomLevel,
        getTreeZoomScaleValue,
    } from "./treeZoomStore";
    import {
        nodePrimaryAction,
        NodePrimaryAction,
    } from "./nodePrimaryActionStore";
    import { nodeLevelBehavior } from "./nodeLevelBehaviorStore";
    import { showTier } from "./showTierStore";
    import { showSkillName } from "./showSkillNameStore";
    import {
        applyLevelChange,
        nextTierTargetLevel,
        previousTierTargetLevel,
        tierUpper,
        tierIndex,
    } from "./tierLeveling";
    import {
        GLOBAL_LEVELED_LEAF_NODE_CAP,
        countGlobalLeveledLeafNodesInTree,
        isGlobalLeafNodeIncrementLocked,
        shouldBlockIncrementForGlobalLeafCap,
    } from "./globalLeafCap";
    import { getTreeViewportPadding, getTreeWorldBounds } from "./treeLayout";
    import type { LevelsByIndex, Link, NodeIndex } from "../types/tree";
    import { t } from "svelte-whisper";

    export let nodes: NodeType[] = [];
    export let bottomInset = 0;
    export let gesturesDisabled = false;
    export let initialViewState: TreeViewState | null = null;
    export let levelsById: LevelsByIndex | null = null;
    export let globalLeveledLeafNodesOutsideTreeCount = 0;
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
    let treeCanvasEl: HTMLDivElement | null = null;
    export const getTreeCanvas = (): HTMLDivElement | null => treeCanvasEl;

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

        const bounds = getWorldBounds();
        if (!bounds) {
            return { minScale: 0.1, maxScale: 2.2 };
        }

        const rect = viewportEl.getBoundingClientRect();
        const padding = getTreeViewportPadding({
            showSkillName: $showSkillName,
            showTier: $showTier,
        });
        const availableW = Math.max(rect.width - padding.horizontal * 2, 1);
        const availableH = Math.max(
            rect.height - bottomInset - padding.top - padding.bottom,
            1,
        );

        // Minimum scale: fit all nodes in viewport with some extra zoom out capability
        const minScaleToFit = Math.min(
            availableW / bounds.width,
            availableH / bounds.height,
        );
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
    const middleClickCandidates = new Map<
        number,
        { startX: number; startY: number; nodeIndex: NodeIndex }
    >();

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
    let multiTouchGestureActive = false;

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
        if (
            next.length !== levels.length ||
            next.some((v, i) => v !== levels[i])
        ) {
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

    let parentIndicesByNode: number[][] = [];
    let linkList: Link[] = [];
    let hasChildByIndex: boolean[] = [];

    function parentsFor(index: NodeIndex): number[] {
        return parentIndicesByNode[index] ?? [];
    }

    $: {
        parentIndicesByNode = nodes.map((node) => parentIndices(node));
        const nextLinks: Link[] = [];
        const nextHasChildByIndex = nodes.map(() => false);

        parentIndicesByNode.forEach((parents, to) => {
            if (parents.length === 0) {
                nextLinks.push({ to });
                return;
            }

            parents.forEach((parentIndex) => {
                nextLinks.push({ from: parentIndex, to });
                if (
                    parentIndex >= 0 &&
                    parentIndex < nextHasChildByIndex.length
                ) {
                    nextHasChildByIndex[parentIndex] = true;
                }
            });
        });

        linkList = nextLinks;
        hasChildByIndex = nextHasChildByIndex;
    }

    function isLeafNode(index: number): boolean {
        const parents = parentsFor(index);
        return parents.length > 0 && !hasChildByIndex[index];
    }

    function countGlobalLeveledLeafNodes(
        levelsSnapshot: LevelsByIndex,
    ): number {
        return countGlobalLeveledLeafNodesInTree(nodes, levelsSnapshot);
    }

    function getGlobalLeveledLeafNodeCount(levelsSnapshot: LevelsByIndex) {
        return (
            globalLeveledLeafNodesOutsideTreeCount +
            countGlobalLeveledLeafNodes(levelsSnapshot)
        );
    }

    function isGlobalLeveledLeafNodeLocked(
        index: number,
        levelsSnapshot: LevelsByIndex,
    ): boolean {
        return isGlobalLeafNodeIncrementLocked({
            isLeafNode: isLeafNode(index),
            currentLevel: getLevelFrom(levelsSnapshot, index),
            globalLeveledLeafNodeCount:
                getGlobalLeveledLeafNodeCount(levelsSnapshot),
            globalLeveledLeafNodeCap: GLOBAL_LEVELED_LEAF_NODE_CAP,
        });
    }

    function getLevelFrom(levelsSnapshot: LevelsByIndex, index: NodeIndex) {
        return levelsSnapshot[index] ?? 0;
    }

    function getLevel(index: NodeIndex) {
        return getLevelFrom(levels, index);
    }

    function isAvailable(
        index: number,
        levelsSnapshot: LevelsByIndex,
    ): boolean {
        const parents = parentsFor(index);
        if (parents.length === 0) return true;
        return parents.every((pi) => {
            const parent = getNodeAt(pi);
            if (!parent) return false;
            const level = getLevelFrom(levelsSnapshot, pi);
            const needed = tierUpper(1, parent.maxLevel);
            return level >= needed;
        });
    }

    function getState(
        node: NodeType,
        index: number,
        levelsSnapshot: LevelsByIndex,
    ): NodeState {
        const level = getLevelFrom(levelsSnapshot, index);
        if (level >= node.maxLevel) return "maxed";
        if (level > 0) return "active";
        if (isGlobalLeveledLeafNodeLocked(index, levelsSnapshot))
            return "locked";
        if (isAvailable(index, levelsSnapshot)) return "available";
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

        const parents = parentsFor(index);
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

    type RenderNode = {
        node: NodeType;
        index: NodeIndex;
        level: number;
        state: NodeState;
        tier: number;
        region: NodeRegion;
        isLeaf: boolean;
        isGlobalIncrementLocked: boolean;
    };

    type RenderLink = {
        fromNode: NodeType | null;
        toNode: NodeType;
        state: NodeState;
        region: NodeRegion;
    };

    let renderNodes: RenderNode[] = [];
    let renderLinks: RenderLink[] = [];
    let contextMenuNode: NodeType | null = null;
    let contextMenuLevel = 0;
    let contextMenuMaxLevel = 0;
    let contextMenuIsGlobalIncrementLocked = false;

    $: {
        renderNodes = nodes.map((node, index) => {
            const level = getLevelFrom(levels, index);
            const state = getState(node, index, levels);
            return {
                node,
                index,
                level,
                state,
                tier: tierIndex(level, node.maxLevel),
                region: getNodeRegion(node, index),
                isLeaf: isLeafNode(index),
                isGlobalIncrementLocked: isGlobalLeveledLeafNodeLocked(
                    index,
                    levels,
                ),
            };
        });
    }

    // Y-sort render order: later-rendered nodes stack on top in the DOM, so the level
    // badge of an earlier node can appear under a later node's name badge. We sort by node.y
    // descending (higher y first) so lower-y nodes render later and correctly stack on top
    // (painter's algorithm). Key remains nodeView.index so all index-based logic is unchanged.
    $: sortedRenderNodes = [...renderNodes].sort(
        (a, b) => b.node.y - a.node.y || a.index - b.index,
    );

    $: {
        renderLinks = linkList
            .map((link) => {
                const to = renderNodes[link.to];
                if (!to) return null;
                const parentLevel =
                    link.from === undefined
                        ? 0
                        : getLevelFrom(levels, link.from);
                const state =
                    link.from === undefined || parentLevel > 0
                        ? to.state
                        : "locked";
                return {
                    fromNode:
                        link.from === undefined
                            ? null
                            : (getNodeAt(link.from) ?? null),
                    toNode: to.node,
                    state,
                    region: to.region,
                };
            })
            .filter((link): link is RenderLink => link !== null);
    }

    $: {
        const contextIndex = contextMenu?.index;
        if (contextIndex === null || contextIndex === undefined) {
            contextMenuNode = null;
            contextMenuLevel = 0;
            contextMenuMaxLevel = 0;
            contextMenuIsGlobalIncrementLocked = false;
        } else {
            const node = getNodeAt(contextIndex);
            if (!node) {
                contextMenuNode = null;
                contextMenuLevel = 0;
                contextMenuMaxLevel = 0;
                contextMenuIsGlobalIncrementLocked = false;
            } else {
                contextMenuNode = node;
                contextMenuLevel = getLevelFrom(levels, contextIndex);
                contextMenuMaxLevel = node.maxLevel;
                contextMenuIsGlobalIncrementLocked =
                    isGlobalLeveledLeafNodeLocked(contextIndex, levels);
            }
        }
    }

    function applyChange(index: NodeIndex, targetLevel: number) {
        const currentLevel = getLevel(index);
        const { levels: nextLevels, deltas } = applyLevelChange({
            nodes,
            levels,
            index,
            targetLevel,
            nodeLevelBehavior: $nodeLevelBehavior,
        });
        if (deltas.length === 0) return false;
        const isGlobalIncrement = targetLevel > currentLevel;
        if (isGlobalIncrement) {
            const currentGlobalLeveledLeafNodeCount =
                getGlobalLeveledLeafNodeCount(levels);
            const nextGlobalLeveledLeafNodeCount =
                getGlobalLeveledLeafNodeCount(nextLevels);
            if (
                shouldBlockIncrementForGlobalLeafCap({
                    currentGlobalLeveledLeafNodeCount,
                    nextGlobalLeveledLeafNodeCount,
                    globalLeveledLeafNodeCap: GLOBAL_LEVELED_LEAF_NODE_CAP,
                })
            ) {
                return false;
            }
        }
        updateLevels(nextLevels);
        return true;
    }

    function levelUp(index: NodeIndex) {
        const node = getNodeAt(index);
        if (!node) return false;
        const level = getLevel(index);
        const nextLevel = Math.min(level + 1, node.maxLevel);
        return applyChange(index, nextLevel);
    }

    function levelDown(index: NodeIndex) {
        const level = getLevel(index);
        if (level === 0) return;
        applyChange(index, level - 1);
    }

    function levelDownBy10(index: NodeIndex) {
        const level = getLevel(index);
        if (level === 0) return;
        const nextLevel = Math.max(level - 10, 0);
        applyChange(index, nextLevel);
    }

    function resetNode(index: NodeIndex) {
        const level = getLevel(index);
        if (level === 0) return;
        applyChange(index, 0);
    }

    function levelUpBy10(index: NodeIndex) {
        const node = getNodeAt(index);
        if (!node) return;
        const level = getLevel(index);
        const nextLevel = Math.min(level + 10, node.maxLevel);
        applyChange(index, nextLevel);
    }

    function levelUpTier(index: NodeIndex) {
        const node = getNodeAt(index);
        if (!node) return;
        const level = getLevel(index);
        if (level >= node.maxLevel) return;
        const nextLevel = nextTierTargetLevel(level, node.maxLevel);
        applyChange(index, nextLevel);
    }

    function levelDownTier(index: NodeIndex) {
        const node = getNodeAt(index);
        if (!node) return;
        const level = getLevel(index);
        if (level <= 0) return;
        const nextLevel = previousTierTargetLevel(level, node.maxLevel);
        applyChange(index, nextLevel);
    }

    function applyPrimaryNodeAction(index: NodeIndex) {
        if ($nodePrimaryAction === NodePrimaryAction.IncrementOne) {
            levelUp(index);
            return;
        }
        if ($nodePrimaryAction === NodePrimaryAction.IncrementTen) {
            levelUpBy10(index);
            return;
        }
        levelUpTier(index);
    }

    function applyOppositeNodeAction(index: NodeIndex) {
        if ($nodePrimaryAction === NodePrimaryAction.IncrementOne) {
            levelDown(index);
            return;
        }
        if ($nodePrimaryAction === NodePrimaryAction.IncrementTen) {
            levelDownBy10(index);
            return;
        }
        levelDownTier(index);
    }

    export function resetAllNodes() {
        updateLevels(nodes.map(() => 0));
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
                try {
                    viewportEl.releasePointerCapture(pointerId);
                } catch {
                    // Pointer may already be released (e.g. user lifted finger before long-press fired)
                }
            }
        }
        pointers.clear();
        middleClickCandidates.clear();
        panStart = null;
        pinchStart = null;
        primaryPointerId = null;
        primaryStart = null;
        panActive = false;
        multiTouchGestureActive = false;
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
            suppressNextPointerUp(pointerId);
            const nodeEl =
                viewportEl?.querySelector(
                    `[data-node-id="${pointer.nodeIndex}"]`,
                ) ?? null;
            const pos = getNodeMenuPosition(nodeEl) ?? {
                x: pointer.x,
                y: pointer.y,
            };
            contextMenu = {
                index: pointer.nodeIndex,
                x: pos.x,
                y: pos.y,
            };
            cancelActiveGestures();
            return true;
        });
    }

    const NODE_MENU_GAP = 4;

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

    function getNodeMenuPosition(
        nodeEl: Element | null,
    ): { x: number; y: number } | null {
        if (!nodeEl) return null;
        const wrapper = nodeEl.closest(".node-wrapper");
        const el = (wrapper ?? nodeEl) as Element;
        const rect = el.getBoundingClientRect();
        const levelSlot = wrapper?.querySelector(".node-badge-slot-level");
        const bottom = levelSlot
            ? Math.max(rect.bottom, levelSlot.getBoundingClientRect().bottom)
            : rect.bottom;
        return {
            x: rect.left + rect.width / 2,
            y: bottom + NODE_MENU_GAP,
        };
    }

    function onContextMenu(event: MouseEvent) {
        if (gesturesDisabled) return;
        // Ignore touch-synthesized contextmenu - we use long-press for that
        if (event.button !== 2) {
            event.preventDefault();
            return;
        }
        const info = getNodeInfoFromTarget(event.target);
        if (!info || info.isRoot || info.index === null) return;

        event.preventDefault();
        hideTooltip();
        const nodeEl =
            event.target instanceof Element
                ? event.target.closest("[data-node-id]")
                : null;
        const pos = getNodeMenuPosition(nodeEl) ?? {
            x: event.clientX,
            y: event.clientY,
        };
        contextMenu = { index: info.index, x: pos.x, y: pos.y };
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
        const info = getNodeInfoFromTarget(event.target);

        if (event.pointerType === "mouse" && event.button === 1) {
            if (contextMenu) {
                if (isInContextMenu(event.target)) return;
                closeContextMenu();
                cancelActiveGestures();
                return;
            }
            if (!info || info.index === null || info.isRoot) {
                event.preventDefault();
                focusTreeInView();
                return;
            }
            event.preventDefault();
            viewportEl.setPointerCapture(event.pointerId);
            middleClickCandidates.set(event.pointerId, {
                startX: event.clientX,
                startY: event.clientY,
                nodeIndex: info.index,
            });
            return;
        }
        if (!isPrimaryPointer(event)) return;
        if (contextMenu) {
            if (isInContextMenu(event.target)) return;
            closeContextMenu();
            cancelActiveGestures();
            return;
        }
        viewportEl.setPointerCapture(event.pointerId);
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
            multiTouchGestureActive = false;
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
            if (
                info &&
                !info.isRoot &&
                info.index !== null &&
                !(event.pointerType === "mouse" && event.shiftKey)
            ) {
                startNodeLongPress(event.pointerId);
            }
        } else if (pointers.size === 2) {
            multiTouchGestureActive = true;
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
        const middleClick = middleClickCandidates.get(event.pointerId);
        if (middleClick) {
            const distance = Math.hypot(
                event.clientX - middleClick.startX,
                event.clientY - middleClick.startY,
            );
            if (distance > LONG_PRESS_MOVE_THRESHOLD) {
                middleClickCandidates.delete(event.pointerId);
                if (viewportEl) {
                    try {
                        viewportEl.releasePointerCapture(event.pointerId);
                    } catch {
                        // Pointer may already be released.
                    }
                }
            }
            return;
        }
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
                suppressTooltip(primaryPointerId);
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
        const middleClick = middleClickCandidates.get(event.pointerId);
        if (middleClick) {
            middleClickCandidates.delete(event.pointerId);
            if (viewportEl) {
                try {
                    viewportEl.releasePointerCapture(event.pointerId);
                } catch {
                    // Pointer may already be released.
                }
            }
            const movedDistance = Math.hypot(
                event.clientX - middleClick.startX,
                event.clientY - middleClick.startY,
            );
            if (
                event.type === "pointerup" &&
                movedDistance <= LONG_PRESS_MOVE_THRESHOLD
            ) {
                applyOppositeNodeAction(middleClick.nodeIndex);
            }
            return;
        }

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
            !multiTouchGestureActive &&
            pointers.size === 0
        ) {
            if (pointer.isRoot) {
                triggerHaptic();
                if (onOpenTreeContextMenu) {
                    onOpenTreeContextMenu(event.clientX, event.clientY);
                } else {
                    focusTreeInView(true);
                }
            } else if (pointer.nodeIndex !== null) {
                triggerHaptic();
                const shouldDecrement =
                    event.pointerType === "mouse" && event.shiftKey;
                if (shouldDecrement) {
                    applyOppositeNodeAction(pointer.nodeIndex);
                } else {
                    applyPrimaryNodeAction(pointer.nodeIndex);
                }
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
            multiTouchGestureActive = false;
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
        // Include node radius plus badge overhang in world bounds.
        const bounds = getWorldBounds();
        if (!bounds) return null;
        const { minX, minY, width, height } = bounds;

        const padding = getTreeViewportPadding({
            showSkillName: $showSkillName,
            showTier: $showTier,
        });
        const availableW = Math.max(rect.width - padding.horizontal * 2, 1);
        const availableH = Math.max(
            rect.height - bottomInset - padding.top - padding.bottom,
            1,
        );
        const paddedCenterX = padding.horizontal + availableW / 2;
        const paddedCenterY = padding.top + availableH / 2;
        // Calculate scale needed to fit all nodes in viewport (100% base)
        const fitScale = Math.min(availableW / width, availableH / height);
        const isCloseUpZoom = $treeZoomScale === TreeZoomLevel.CloseUp;
        const zoomMultiplier =
            getTreeZoomScaleValue($treeZoomScale) /
            getTreeZoomScaleValue(TreeZoomLevel.Fit);
        const nextScale = clamp(fitScale * zoomMultiplier, minScale, maxScale);
        const centerX = isCloseUpZoom ? 0 : minX + width / 2;
        const centerY = isCloseUpZoom ? 0 : minY + height / 2;
        const nextOffsetX = paddedCenterX - centerX * nextScale;
        const nextOffsetY = paddedCenterY - centerY * nextScale;
        const clamped = clampOffsets(nextOffsetX, nextOffsetY, nextScale);
        return { offsetX: clamped.x, offsetY: clamped.y, scale: nextScale };
    }

    function getWorldBounds() {
        const layoutNodes = nodes.map((node) => ({
            x: node.x,
            y: node.y,
            radius: node.radius,
            maxLevel: node.maxLevel,
            skillId: node.skillId,
        }));

        return getTreeWorldBounds(layoutNodes, {
            showSkillName: $showSkillName,
            showTier: $showTier,
        });
    }

    function clampOffsets(
        nextOffsetX: number,
        nextOffsetY: number,
        nextScale = scale,
    ) {
        if (!viewportEl) return { x: nextOffsetX, y: nextOffsetY };

        const rect = viewportEl.getBoundingClientRect();
        const bounds = getWorldBounds();

        // Without content bounds fall back to a simple viewport-based clamp
        if (!bounds) {
            const effectiveScale = Math.max(nextScale, 1);
            return {
                x: clamp(
                    nextOffsetX,
                    -rect.width * (effectiveScale - 1),
                    rect.width * effectiveScale,
                ),
                y: clamp(
                    nextOffsetY,
                    -rect.height * (effectiveScale - 1),
                    rect.height * effectiveScale,
                ),
            };
        }

        // Content-aware clamp: keep at least `margin` px of the content
        // bounding box visible. Nodes can freely scroll behind safe areas
        // (status bar, nav bar) — initial positioning still respects them via
        // computeFocusViewState which uses bottomInset.
        const margin = 48;
        return {
            x: clamp(
                nextOffsetX,
                margin - bounds.maxX * nextScale,
                rect.width - margin - bounds.minX * nextScale,
            ),
            y: clamp(
                nextOffsetY,
                margin - bounds.maxY * nextScale,
                rect.height - margin - bounds.minY * nextScale,
            ),
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
            showToast($t("tree.focusedInViewToast"));
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
        // Re-focus tree whenever zoom mode changes.
        treeZoomScale.setOnChange(() => {
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
            treeZoomScale.setOnChange(null);
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
                bind:this={treeCanvasEl}
                style={`transform: translate(${offsetX}px, ${offsetY}px) scale(${scale});`}
            >
                <svg class="tree-links" overflow="visible">
                    {#each renderLinks as link}
                        <line
                            class={`tree-link ${link.state} region-${link.region}`}
                            x1={link.fromNode ? link.fromNode.x : 0}
                            y1={link.fromNode ? link.fromNode.y : 0}
                            x2={link.toNode.x}
                            y2={link.toNode.y}
                        />
                    {/each}
                </svg>

                <RootNode
                    {onOpenTreeContextMenu}
                    onFocusView={() => focusTreeInView(true)}
                />

                {#each sortedRenderNodes as nodeView (nodeView.index)}
                    <Node
                        id={nodeView.index}
                        x={nodeView.node.x}
                        y={nodeView.node.y}
                        label={$t(`skills.${nodeView.node.skillId}`)}
                        level={nodeView.level}
                        state={nodeView.state}
                        tier={nodeView.tier}
                        showTier={$showTier}
                        showSkillName={$showSkillName}
                        radius={nodeView.node.radius ?? 1}
                        {scale}
                        region={nodeView.region}
                        isLeaf={nodeView.isLeaf}
                        isGlobalIncrementLocked={nodeView.isGlobalIncrementLocked}
                        skillId={nodeView.node.skillId}
                        maxLevel={nodeView.node.maxLevel}
                    />
                {/each}
            </div>

            <NodeContentMenu
                nodeIndex={contextMenu?.index ?? null}
                x={contextMenu?.x ?? 0}
                y={contextMenu?.y ?? 0}
                isOpen={!!contextMenu}
                skillId={contextMenuNode?.skillId ?? null}
                onClose={closeContextMenu}
                onIncrementTier={levelUpTier}
                onReset={resetNode}
                onDecrement={levelDown}
                onDecrementBy10={levelDownBy10}
                onIncrement={levelUp}
                onIncrementBy10={levelUpBy10}
                level={contextMenuLevel}
                maxLevel={contextMenuMaxLevel}
                isGlobalIncrementLocked={contextMenuIsGlobalIncrementLocked}
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
        gap: var(--spacing-md);
    }

    .tree-viewport {
        position: relative;
        flex: 1;
        overflow: hidden;
        touch-action: none;
        overscroll-behavior: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
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

    .tree-links .tree-link {
        stroke-width: 4;
        stroke: var(--link-color);
        filter: none;
        transition: stroke-opacity 0.2s;
    }

    .tree-links .tree-link.region-top-left {
        --link-color: var(--region-orange-accent);
    }

    .tree-links .tree-link.region-bottom-left {
        --link-color: var(--region-yellow-accent);
    }

    .tree-links .tree-link.region-right {
        --link-color: var(--region-blue-accent);
    }

    .tree-links .tree-link.locked {
        stroke: var(--node-locked-border);
        filter: var(--node-brightness-locked);
    }

    .tree-links .tree-link.available {
        stroke: var(--link-color);
        filter: var(--node-brightness-available);
    }

    .tree-links .tree-link.active {
        stroke: var(--link-color);
    }
</style>
