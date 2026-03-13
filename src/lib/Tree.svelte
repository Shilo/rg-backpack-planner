<script lang="ts" context="module">
    import type { Node as NodeType } from "../types/tree";

    export type TreeViewState = {
        offsetX: number;
        offsetY: number;
        scale: number;
    };
</script>

<script lang="ts">
    import { onMount, tick, setContext } from "svelte";
    import { writable } from "svelte/store";
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
    import OnboardingOverlay from "./OnboardingOverlay.svelte";
    import { onboardingSeen } from "./onboardingStore";
    import { textSize } from "./textSizeStore";
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
    import { TREE_ROOT_X, TREE_ROOT_Y } from "../config/baseTree";
    import type { LevelsByIndex, Link, NodeIndex } from "../types/tree";
    import { locale, t } from "svelte-whisper";
    import LevelUpSplash from "./LevelUpSplash.svelte";
    import { showLevelSplash } from "./showLevelSplashStore";
    import { sumDeltaCosts } from "./nodeActionPreview";

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
    export let rootX = TREE_ROOT_X;
    export let rootY = TREE_ROOT_Y;

    let levels: LevelsByIndex = [];
    const treeData = writable({ nodes, levels });
    setContext("tree", treeData);
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
        // Keep min/max scale tied to user text-size setting because badge overflow
        // derives from root font size.
        void $textSize;

        if (!viewportEl || nodes.length === 0) {
            return { minScale: 0.1, maxScale: 2.2 };
        }

        const bounds = getWorldBounds(1);
        if (!bounds) {
            return { minScale: 0.1, maxScale: 2.2 };
        }

        const rect = viewportEl.getBoundingClientRect();
        const padding = getTreeViewportPadding();
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

    type SplashData = {
        nodeIndex: NodeIndex;
        x: number;
        y: number;
        level: number;
        isUp: boolean;
        crystalDelta: number;
        skipEntry: boolean;
    };
    let activeSplashes: SplashData[] = [];

    function updateLevels(nextLevels: LevelsByIndex) {
        levels = nextLevels;
        treeData.set({ nodes, levels });
        onLevelsChange?.(nextLevels);
    }

    $: if (levelsById) {
        // Copy from external prop; clamp/pad to match node count
        const next: LevelsByIndex = nodes.map((_, i) => levelsById[i] ?? 0);
        levels = next;
        treeData.set({ nodes, levels });
    } else {
        // Ensure levels array matches node count
        const next: LevelsByIndex = nodes.map((_, i) => levels[i] ?? 0);
        if (
            next.length !== levels.length ||
            next.some((v, i) => v !== levels[i])
        ) {
            levels = next;
            treeData.set({ nodes, levels });
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
        if (node.x > rootX) return "right";
        if (node.y < rootY) return "top-left";
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
        strokeStyle: string;
    };

    // SVG <line> elements need stroke/filter as inline styles because snapdom
    // (DOM-to-image) ignores CSS stylesheet rules on SVG elements. The CSS rules
    // in the style block still apply for live rendering; the inline style acts as a
    // fallback so captured screenshots have correct line colors and brightness.
    const REGION_STROKE_COLOR: Record<NodeRegion, string> = {
        "top-left": "var(--region-orange-accent)",
        "bottom-left": "var(--region-yellow-accent)",
        right: "var(--region-blue-accent)",
    };

    function getLinkStrokeStyle(state: NodeState, region: NodeRegion): string {
        if (state === "locked") {
            return `stroke: var(--node-locked-border); filter: var(--node-brightness-locked);`;
        }
        if (state === "available") {
            // --capture-link-stroke/filter are only defined during capture
            // (html.snapdom-capture in app.css), overriding to locked style.
            // During normal rendering the fallback (region accent) is used.
            const color = `var(--capture-link-stroke, ${REGION_STROKE_COLOR[region]})`;
            const filter = `var(--capture-link-filter, var(--node-brightness-available))`;
            return `stroke: ${color}; filter: ${filter};`;
        }
        return `stroke: ${REGION_STROKE_COLOR[region]}; filter: drop-shadow(0 0 3px ${REGION_STROKE_COLOR[region]});`;
    }

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
                    strokeStyle: getLinkStrokeStyle(state, to.region),
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

    $: contextMenuRenderNode =
        contextMenu?.index != null
            ? (renderNodes[contextMenu.index] ?? null)
            : null;

    function removeSplash(nodeIndex: NodeIndex) {
        activeSplashes = activeSplashes.filter(
            (s) => s.nodeIndex !== nodeIndex,
        );
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
        const prevLevels = levels;
        updateLevels(nextLevels);
        if ($showLevelSplash) {
            const targetNode = getNodeAt(index);
            if (targetNode) {
                const totalCrystalDelta =
                    targetLevel > currentLevel
                        ? sumDeltaCosts(nodes, prevLevels, deltas)
                        : -sumDeltaCosts(nodes, prevLevels, deltas);
                const newSplash: SplashData = {
                    nodeIndex: index,
                    x: targetNode.x,
                    y: targetNode.y,
                    level: getLevelFrom(nextLevels, index),
                    isUp: targetLevel > currentLevel,
                    crystalDelta: totalCrystalDelta,
                    skipEntry: false,
                };
                activeSplashes = [
                    ...activeSplashes.filter((s) => s.nodeIndex !== index),
                    newSplash,
                ];
            }
        }
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
        const prevLevels = [...levels];
        updateLevels(nodes.map(() => 0));
        if ($showLevelSplash) {
            const resetDeltas = [];
            for (let i = 0; i < nodes.length; i++) {
                const prev = prevLevels[i] ?? 0;
                if (prev > 0) resetDeltas.push({ index: i, delta: -prev });
            }
            const hadLevels = resetDeltas.length > 0;
            const totalCrystalDelta = hadLevels
                ? -sumDeltaCosts(nodes, prevLevels, resetDeltas)
                : 0;
            if (hadLevels) {
                const root = nodes[0];
                if (root) {
                    activeSplashes = [
                        {
                            nodeIndex: 0 as NodeIndex,
                            x: root.x,
                            y: root.y,
                            level: 0,
                            isUp: false,
                            crystalDelta: totalCrystalDelta,
                            skipEntry: true,
                        },
                    ];
                }
            }
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

    export function restoreViewState(view: TreeViewState | null) {
        if (!view) return;
        setViewState(view);
        allowReactiveFocus = false;
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

    const NODE_MENU_GAP = 16;

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
                allowReactiveFocus = false;
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
            allowReactiveFocus = false;
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

    function computeFocusViewState(
        overrideZoom?: TreeZoomLevel,
    ): TreeViewState | null {
        if (!viewportEl || nodes.length === 0) return null;
        const rect = viewportEl.getBoundingClientRect();
        // Ensure viewport has valid dimensions
        if (rect.width <= 0 || rect.height <= 0) return null;
        // Include node radius plus badge overhang in world bounds.
        const baseBounds = getWorldBounds(1);
        if (!baseBounds) return null;

        const padding = getTreeViewportPadding();
        const availableW = Math.max(rect.width - padding.horizontal * 2, 1);
        const availableH = Math.max(
            rect.height - bottomInset - padding.top - padding.bottom,
            1,
        );
        const paddedCenterX = padding.horizontal + availableW / 2;
        const paddedCenterY = padding.top + availableH / 2;
        const zoomLevel = overrideZoom ?? $treeZoomScale;
        const isCloseUpZoom = zoomLevel === TreeZoomLevel.CloseUp;
        const zoomMultiplier =
            getTreeZoomScaleValue(zoomLevel) /
            getTreeZoomScaleValue(TreeZoomLevel.Fit);
        // Refine fit scale using the candidate scale so horizontal bounds can
        // account for badge non-shrinking behavior when zoomed out.
        let nextScale = clamp(
            Math.min(
                availableW / baseBounds.width,
                availableH / baseBounds.height,
            ) * zoomMultiplier,
            minScale,
            maxScale,
        );
        let bounds = baseBounds;
        for (let i = 0; i < 2; i++) {
            const scaledBounds = getWorldBounds(nextScale);
            if (!scaledBounds) break;
            bounds = scaledBounds;
            const refinedScale = clamp(
                Math.min(
                    availableW / scaledBounds.width,
                    availableH / scaledBounds.height,
                ) * zoomMultiplier,
                minScale,
                maxScale,
            );
            if (Math.abs(refinedScale - nextScale) < 1e-3) {
                nextScale = refinedScale;
                break;
            }
            nextScale = refinedScale;
        }

        bounds = getWorldBounds(nextScale) ?? bounds;
        const { minX, minY, width, height } = bounds;
        const centerX = isCloseUpZoom ? rootX : minX + width / 2;
        const centerY = isCloseUpZoom ? rootY : minY + height / 2;
        const nextOffsetX = paddedCenterX - centerX * nextScale;
        const nextOffsetY = paddedCenterY - centerY * nextScale;
        const clamped = clampOffsets(nextOffsetX, nextOffsetY, nextScale);
        return { offsetX: clamped.x, offsetY: clamped.y, scale: nextScale };
    }

    function getWorldBounds(badgeScale = scale) {
        const layoutNodes = nodes.map((node) => ({
            x: node.x,
            y: node.y,
            radius: node.radius,
            maxLevel: node.maxLevel,
            skillId: node.skillId,
            nameLabel:
                $t(`skills.short.${node.skillId}`) ||
                $t(`skills.${node.skillId}`),
        }));

        return getTreeWorldBounds(layoutNodes, {
            showSkillName: $showSkillName,
            showTier: $showTier,
            badgeScale,
        });
    }

    function clampOffsets(
        nextOffsetX: number,
        nextOffsetY: number,
        nextScale = scale,
    ) {
        if (!viewportEl) return { x: nextOffsetX, y: nextOffsetY };

        const rect = viewportEl.getBoundingClientRect();
        const bounds = getWorldBounds(nextScale);

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
        allowReactiveFocus = false;
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
        allowReactiveFocus = true;
        if (announce) {
            showToast($t("tree.focusedInViewToast"));
        }
        return true;
    }

    // Focuses the tree at Fit scale regardless of the user's zoom setting.
    // Used by capture so the full tree is always visible in the exported image.
    export function focusTreeInViewForCapture() {
        const next = computeFocusViewState(TreeZoomLevel.Fit);
        if (!next) return;
        offsetX = next.offsetX;
        offsetY = next.offsetY;
        scale = next.scale;
        // Do NOT set allowReactiveFocus — capture applies a temporary transform
        // that will be restored by restoreViewState after capture completes.
    }

    export function getFocusViewState() {
        return focusViewState ?? computeFocusViewState();
    }

    let resizeObserver: ResizeObserver | null = null;
    let hasMounted = false;
    let lastAppliedBottomInset = bottomInset;
    let allowReactiveFocus = false;
    let hasSeenInitialTextSize = false;
    let hasSeenInitialShowTier = false;
    let hasSeenInitialShowSkillName = false;
    let hasSeenInitialLocale = false;

    $: if (hasMounted && bottomInset !== lastAppliedBottomInset) {
        lastAppliedBottomInset = bottomInset;
        if (allowReactiveFocus) {
            focusTreeInView(false);
        }
    }

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
        hasMounted = true;
        lastAppliedBottomInset = bottomInset;

        // Re-focus tree whenever zoom mode changes.
        treeZoomScale.setOnChange(() => {
            focusTreeInView(false);
        });
        const unsubscribeTextSize = textSize.subscribe(() => {
            if (!hasSeenInitialTextSize) {
                hasSeenInitialTextSize = true;
                return;
            }
            if (!allowReactiveFocus) return;
            focusTreeInView(false);
        });
        const unsubscribeShowTier = showTier.subscribe(() => {
            if (!hasSeenInitialShowTier) {
                hasSeenInitialShowTier = true;
                return;
            }
            if (!allowReactiveFocus) return;
            focusTreeInView(false);
        });
        const unsubscribeShowSkillName = showSkillName.subscribe(() => {
            if (!hasSeenInitialShowSkillName) {
                hasSeenInitialShowSkillName = true;
                return;
            }
            if (!allowReactiveFocus) return;
            focusTreeInView(false);
        });
        const unsubscribeLocale = locale.subscribe(() => {
            if (!hasSeenInitialLocale) {
                hasSeenInitialLocale = true;
                return;
            }
            if (!$showSkillName) return;
            if (!allowReactiveFocus) return;
            // Locale changes can arrive before translated badge text is fully
            // reflected by `$t`, so defer one frame before recomputing bounds.
            requestAnimationFrame(() => {
                if (!$showSkillName) return;
                if (!allowReactiveFocus) return;
                focusTreeInView(false);
            });
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
            focusTreeInView(false);
        };
        window.addEventListener("resize", handleResize, { passive: true });

        return () => {
            hasMounted = false;
            window.removeEventListener("resize", handleResize);
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }
            treeZoomScale.setOnChange(null);
            unsubscribeTextSize();
            unsubscribeShowTier();
            unsubscribeShowSkillName();
            unsubscribeLocale();
        };
    });

    $: if (gesturesDisabled) {
        cancelActiveGestures();
    }

    $: {
        void viewportSize.width;
        void viewportSize.height;
        void bottomInset;
        void minScale;
        void maxScale;
        void $showSkillName;
        void $showTier;
        void $treeZoomScale;
        void $textSize;
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
                            x1={link.fromNode ? link.fromNode.x : rootX}
                            y1={link.fromNode ? link.fromNode.y : rootY}
                            x2={link.toNode.x}
                            y2={link.toNode.y}
                            stroke-width="4"
                            style={link.strokeStyle}
                        />
                    {/each}
                </svg>

                <RootNode
                    x={rootX}
                    y={rootY}
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

            {#if contextMenu && contextMenuRenderNode}
                <div
                    class="node-spotlight-layer"
                    style={`transform: translate(${offsetX}px, ${offsetY}px) scale(${scale});`}
                    aria-hidden="true"
                >
                    <Node
                        id={contextMenuRenderNode.index}
                        x={contextMenuRenderNode.node.x}
                        y={contextMenuRenderNode.node.y}
                        label={$t(
                            `skills.${contextMenuRenderNode.node.skillId}`,
                        )}
                        level={contextMenuLevel}
                        state={contextMenuRenderNode.state}
                        tier={tierIndex(
                            contextMenuLevel,
                            contextMenuRenderNode.node.maxLevel,
                        )}
                        showTier={$showTier}
                        showSkillName={$showSkillName}
                        radius={contextMenuRenderNode.node.radius ?? 1}
                        {scale}
                        region={contextMenuRenderNode.region}
                        isLeaf={contextMenuRenderNode.isLeaf}
                        isGlobalIncrementLocked={contextMenuRenderNode.isGlobalIncrementLocked}
                        skillId={contextMenuRenderNode.node.skillId}
                        maxLevel={contextMenuRenderNode.node.maxLevel}
                    />
                </div>
            {/if}

            <div
                class="tree-splash-layer"
                style={`transform: translate(${offsetX}px, ${offsetY}px) scale(${scale});`}
            >
                {#each activeSplashes as splash (splash.nodeIndex)}
                    <LevelUpSplash
                        x={splash.x}
                        y={splash.y}
                        level={splash.level}
                        isUp={splash.isUp}
                        crystalDelta={splash.crystalDelta}
                        skipEntry={splash.skipEntry}
                        {scale}
                        onDone={() => removeSplash(splash.nodeIndex)}
                    />
                {/each}
            </div>

            {#if !$onboardingSeen}
                <OnboardingOverlay
                    onDismiss={() => onboardingSeen.set(true)}
                    targetNodeIndex={0}
                    {offsetX}
                    {offsetY}
                    {scale}
                />
            {/if}
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

    .node-spotlight-layer {
        position: absolute;
        inset: 0;
        transform-origin: 0 0;
        pointer-events: none;
        z-index: calc(var(--z-index-context-menu) - 1);
    }

    .tree-splash-layer {
        position: absolute;
        inset: 0;
        transform-origin: 0 0;
        pointer-events: none;
        z-index: var(--z-index-tooltip);
    }

    .tree-links {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
    }

    /* stroke, stroke-width, and filter are also set as inline styles / SVG
       attributes on each <line> (see getLinkStrokeStyle) so snapdom in
       captureService.ts can capture them. These CSS rules are kept as fallback. */
    .tree-links .tree-link {
        stroke-width: 4;
        stroke: var(--link-color);
        filter: none;
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
