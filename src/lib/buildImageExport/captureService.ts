/**
 * Tree screenshot capture for export/share. Clones the live tree canvas into
 * an offscreen parent, inlines computed styles, then uses snapdom.toBlob.
 * Three-tree capture prepares all clones sequentially then runs the three
 * toBlob calls in parallel.
 *
 * Library used:
 * - @zumer/snapdom (DOM -> image capture)
 *   npm: https://www.npmjs.com/package/@zumer/snapdom
 *   source: https://github.com/zumerlab/snapdom
 *   docs/demo: https://zumerlab.github.io/snapdom/
 *   This file intentionally does pre-capture stabilization + style inlining
 *   before calling snapdom, because raw DOM capture can miss dynamic styles,
 *   pseudo elements, and timing-sensitive paint state in this tree UI.
 *
 * --- PROBLEMS (why capture glitches without the fixes below) ---
 *
 * 1. Capturing before tree is ready: tab switch remounts Tree; DOM can be
 *    incomplete or mid-paint so we get partial/missing nodes or wrong layout.
 *
 * 2. Reading getComputedStyle too early: if we clone and read styles as soon
 *    as the tree is "stable" (same signature 2 frames), the live tree may not
 *    have painted yet → we bake initial/transparent colors into the clone →
 *    nodes look whiteish or partially colored.
 *
 * 3. Clone depends on stylesheet cascade: node colors come from CSS variables
 *    (--hex-fill, --bg-available, etc.). If snapdom's pipeline loses full
 *    stylesheet context, those variables resolve to initial/transparent →
 *    whiteish nodes.
 *
 * 4. Snapdom can miss CSS for SVG: tree links (.tree-link) use cascade for
 *    stroke/filter; in the clone/snapdom path they can render wrong or missing.
 *
 * 5. Badge anchor scale vs live zoom: badge position uses transform scale; if
 *    we don't normalize to scale(1) on the clone, badges can be mispositioned.
 *
 * 6. Clone positioning conflict: .tree-canvas uses inset positioning; if we
 *    don't reset clone inset/right/bottom to auto and set explicit left/top,
 *    we get stretch/cropping drift across browsers.
 *
 * 7. Offscreen parent background: must be explicitly transparent for mobile
 *    parity (some browsers treat unset background differently).
 *
 * 8. Combined PNG transparency: canvas must use getContext("2d", { alpha: true })
 *    so the stitched image preserves transparency.
 *
 * 9. Name badges clipped: badges sit outside the node circle (sibling of
 *    .button.node). During capture the wrapper/badge-stack can be treated as
 *    a clipping region so badge text is cut off by the circle.
 *
 * 10. Unprepared parent: if waitForStableTreeCanvas returns null for a tab,
 *     we must not run toBlob on that parent (it's empty) or we get a blank
 *     blob; we track prepared[i] and return null for that slot instead.
 *
 * 11. Speed: three sequential toBlob calls (one per tree) were slow; we now
 *     prepare all three clones then run the three toBlob calls in parallel.
 *
 * 12. Transitions/animations during capture: can cause wrong or partial frames;
 *     we add class "snapdom-capture" to html (see app.css) to disable them.
 *
 * 13. Exported tree bounds drifted toward top-right: fixed root-centered constants
 *     did not account for asymmetric world bounds, so Guardian/Cannon could look
 *     offset and center-node position appeared inconsistent after level changes.
 *
 * 14. Name badge left clipping: treeLayout's getNameBadgeWidthPx can underestimate
 *     rendered extent (e.g. "GLOBAL HP" clipped ~10px on left). Badge alignment
 *     and font metrics may differ from treeLayout's canvas measureText.
 *
 * 15. Captured trees lose background context: offscreen parent without runtime
 *     background styles can render differently than live tree (mobile parity).
 *
 * 16. Bounds not reactive to settings: capture used fixed bounds; treeLayout
 *     changes with showSkillName, showTier, font size, locale. Need nameLabel
 *     from i18n and worst-case tier badge (2 lines) for accurate bounds.
 *
 * 17. Aggressive crop clips content: cropping to "zero padding" (40px crop)
 *     clipped right and bottom badge bounds. treeLayout bounds are not always
 *     conservative on all sides.
 *
 * 18. Padding vs clipping tradeoff: zero buffer clips badges; large buffer adds
 *     unwanted padding. Need buffer during capture, then crop transparent pixels.
 *
 * --- FIXES (where they live in this file) ---
 *
 * - waitForStableTreeCanvas: wait until canvas exists, correct tab active,
 *   at least one .button.node, and signature (transform + node/link counts)
 *   unchanged for 2 consecutive frames; max 6 iterations. Avoids (1).
 *
 * - waitForPaintFrames(2) before cloning (PRE_CLONE_PAINT_FRAMES): so we read
 *   getComputedStyle after the live tree has painted. Avoids (2).
 *
 * - preserveNodeVisualStyles: copy computed colors and all color-driving CSS
 *   variables from original to clone (wrappers, .button.node, .node-badge).
 *   Avoids (3).
 *
 * - preserveTreeLinkStrokeStyles: copy stroke/strokeOpacity/strokeWidth/filter
 *   from each .tree-link to clone. Avoids (4).
 *
 * - normalizeBadgeAnchorScale: set transform scale(1) on badge anchors in
 *   clone. Avoids (5).
 *
 * - Clone style reset in prepareTreeCloneInParent: transform/transition/
 *   animation none; inset/right/bottom auto; explicit width/height; overflow
 *   visible; position absolute with left/top. Avoids (6).
 *
 * - createAndAttachOffscreenParent: overflow visible, backgroundColor
 *   "transparent", isolation isolate. Avoids (7).
 *
 * - combineTreeImagesHorizontally: getContext("2d", { alpha: true }).
 *   Avoids (8).
 *
 * - ensureBadgesNotClipped: set overflow "visible" on .node-wrapper and
 *   .node-badge-icon-stack in clone so badges above the circle aren't clipped.
 *   Avoids (9).
 *
 * - captureThreeTreeBlobs: prepared[i] only set after successful prepare;
 *   only call captureParentAsBlob(parent) when prepared[i]; otherwise resolve
 *   null. Avoids (10).
 *
 * - captureThreeTreeBlobs: prepare all three clones in a loop (tab switch +
 *   wait + prepare per tab), then Promise.all([captureParentAsBlob(p0), ...]).
 *   Avoids (11).
 *
 * - withCaptureState: increment capture count, add "snapdom-capture" to
 *   documentElement on first entry, remove on last exit. Avoids (12).
 *
 * - buildCenteredCaptureBounds: compute worst-case export bounds from baseTree via
 *   getTreeWorldBounds(showSkillName+showTier), use tight content bounds
 *   (bounds.width/height not symmetric halfWidth*2), offset for positioning.
 *   Avoids (13). Verified by test/captureServiceCenteredBounds.test.ts.
 *
 * - CAPTURE_BOUNDS_EDGE_BUFFER_PX = 12: expand bounds on all sides so name badges
 *   (e.g. "GLOBAL HP") are not clipped. Avoids (14).
 *
 * - syncCaptureBackground(parent, element): copy runtime background styles from
 *   live tree to offscreen parent before capture. Avoids (15).
 *
 * - buildCenteredCaptureBounds: use nameLabel from i18n (translate), worst-case
 *   level for tier badge (2 lines when showTier && !isMaxed), getTreeVisibleBounds
 *   at capture time for current font size and locale. Avoids (16).
 *
 * - CAPTURE_BOUNDS_CROP_PX = 0: no crop; use full treeLayout bounds to avoid
 *   right/bottom clipping. Avoids (17).
 *
 * - cropBlobToContent: after capture, crop each tree blob to bounding box of
 *   non-transparent pixels (getImageContentBounds). Combined image has minimal
 *   padding with no clipping. Avoids (18).
 *
 * --- KNOWN UNFIXED ISSUES (as of current implementation) ---
 *
 * A. Residual per-tree drift remains in some states (~1-6px): even with world-bounds
 *    centering, captured alpha bounds can land slightly off center. This appears to
 *    come from snapdom rasterization/subpixel behavior (SVG stroke/filter + pseudo
 *    materialization), not from tree world-bounds math itself.
 *
 * B. Level-state-sensitive visual artifacts can still occur: certain node level
 *    combinations (especially involving leaf/hex nodes) may produce occasional ring/
 *    halo artifacts in the exported bitmap. Existing guards reduce this, but do not
 *    fully eliminate it in all captured states.
 *
 * --- FIXES (continued) ---
 *
 * - buildCaptureBoundsFromTabs: when bridge provides getTabs + getTreeLevels, compute
 *   bounds from actual nodes + levels per tab (union across tabs). Fixes wrong center
 *   position and node offset when all global nodes are at level 10+ (bounds previously
 *   used synthetic level=5 for all, causing mismatch with actual badge layout).
 *
 * - addHexagonPseudoSpanStyleFix: SnapDOM materializes hexagon ::before/::after as spans
 *   that can inherit wrong region colors (e.g. red circle behind blue final_damage node).
 *   Force correct --hex-border-color and --hex-fill on those spans.
 *
 * C. Regeneration race UX: if tabs are switched while compose capture is regenerating,
 *    the viewer can briefly show loading/transition frames before the final blob for
 *    that tab is available.
 */
import { get } from "svelte/store";
import { tick } from "svelte";
import { t } from "svelte-whisper";
import { snapdom } from "@zumer/snapdom";
import { baseTree } from "../../config/baseTree";
import {
    tabsBridge,
    captureInProgressCount,
    incrementCapture,
    decrementCapture,
    type TabsCaptureBridge,
} from "./captureBridge";
import {
    getTreeWorldBounds,
    TREE_BADGE_VERTICAL_OVERFLOW_PX,
    type TreeWorldBounds,
} from "../treeLayout";
import type { LevelsByIndex } from "../../types/tree";

type TreeCaptureBounds = {
    centerNode: { x: number; y: number };
    width: number;
    height: number;
};

/** No crop: use full treeLayout bounds to avoid clipping right/bottom badge content. */
const CAPTURE_BOUNDS_CROP_PX = 0;
/** Buffer to prevent name badge clipping (e.g. "GLOBAL HP") - treeLayout can underestimate. */
const CAPTURE_BOUNDS_EDGE_BUFFER_PX = 12;

function buildCaptureBoundsFromTabs(
    tabs: { nodes: { x: number; y: number; radius?: number; maxLevel?: number; skillId?: string | null }[] }[],
    levelsByTab: LevelsByIndex[],
): TreeCaptureBounds {
    let translate: (key: string) => string;
    try {
        translate = get(t);
    } catch {
        translate = () => "";
    }

    let unionBounds: TreeWorldBounds | null = null;

    for (let tabIndex = 0; tabIndex < tabs.length && tabIndex < levelsByTab.length; tabIndex++) {
        const tab = tabs[tabIndex];
        const levels = levelsByTab[tabIndex] ?? [];
        // #region agent log
        const globalIndices = tab.nodes.map((n,i)=>(n.skillId?.startsWith("global_")||n.skillId?.startsWith("final_"))?i:-1).filter(i=>i>=0);
        const globalLevels = globalIndices.map(i=>levels[i]);
        fetch("http://127.0.0.1:7778/ingest/3fa92bd6-575d-4985-ab8d-85d682deadfb",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"bfcb51"},body:JSON.stringify({sessionId:"bfcb51",location:"captureService.ts:buildCaptureBoundsFromTabs",message:"levels per tab",data:{tabIndex,levelsLen:levels.length,globalIndices,globalLevels,sumLevels:levels.reduce((a,b)=>a+(b??0),0)},hypothesisId:"E",timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const nodes = tab.nodes.map((node, i) => {
            const maxLevel = node.maxLevel ?? 1;
            const level = levels[i] ?? (maxLevel > 1 ? 5 : 1);
            const nameLabel =
                node.skillId != null
                    ? translate(`skills.short.${node.skillId}`) ||
                      translate(`skills.${node.skillId}`)
                    : undefined;
            return {
                x: node.x,
                y: node.y,
                radius: node.radius,
                maxLevel,
                skillId: node.skillId,
                level,
                nameLabel: nameLabel || undefined,
            };
        });

        const bounds = getTreeWorldBounds(nodes, {
            showSkillName: true,
            showTier: true,
        });

        if (bounds) {
            if (!unionBounds) {
                unionBounds = { ...bounds };
            } else {
                unionBounds = {
                    minX: Math.min(unionBounds.minX, bounds.minX),
                    maxX: Math.max(unionBounds.maxX, bounds.maxX),
                    minY: Math.min(unionBounds.minY, bounds.minY),
                    maxY: Math.max(unionBounds.maxY, bounds.maxY),
                    width: 0,
                    height: 0,
                };
                unionBounds.width = unionBounds.maxX - unionBounds.minX;
                unionBounds.height = unionBounds.maxY - unionBounds.minY;
            }
        }
    }

    if (!unionBounds) {
        return buildCenteredCaptureBounds();
    }

    const width =
        Math.ceil(unionBounds.width) +
        CAPTURE_BOUNDS_EDGE_BUFFER_PX * 2 -
        CAPTURE_BOUNDS_CROP_PX * 2;
    const height =
        Math.ceil(unionBounds.height) +
        CAPTURE_BOUNDS_EDGE_BUFFER_PX * 2 -
        CAPTURE_BOUNDS_CROP_PX * 2;
    const edgeOffset = CAPTURE_BOUNDS_EDGE_BUFFER_PX - CAPTURE_BOUNDS_CROP_PX;
    const centerNode = { x: edgeOffset - unionBounds.minX, y: edgeOffset - unionBounds.minY };
    // #region agent log
    fetch("http://127.0.0.1:7778/ingest/3fa92bd6-575d-4985-ab8d-85d682deadfb",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"bfcb51"},body:JSON.stringify({sessionId:"bfcb51",location:"captureService.ts:buildCaptureBoundsFromTabs",message:"union bounds",data:{minX:unionBounds.minX,minY:unionBounds.minY,maxX:unionBounds.maxX,maxY:unionBounds.maxY,edgeOffset,centerNode,width,height},hypothesisId:"B",timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return {
        centerNode,
        width: Math.max(1, width),
        height: Math.max(1, height),
    };
}

function buildCenteredCaptureBounds(): TreeCaptureBounds {
    // Capture bounds are derived from the shared tree layout using worst-case
    // badge visibility (names + tier badge lines) so all level states stay
    // stable and never clip. Uses current root font size (text size setting)
    // and translated name labels for accurate badge width/height edge-out.
    let translate: (key: string) => string;
    try {
        translate = get(t);
    } catch {
        translate = () => "";
    }

    const nodes = baseTree.map((node) => {
        const maxLevel = node.maxLevel ?? 1;
        // Worst-case level for tier badge: 2 lines when showTier && !isMaxed
        const level = maxLevel > 1 ? 5 : 1;
        const nameLabel =
            node.skillId != null
                ? translate(`skills.short.${node.skillId}`) ||
                  translate(`skills.${node.skillId}`)
                : undefined;
        return {
            x: node.x,
            y: node.y,
            radius: node.radius,
            maxLevel,
            skillId: node.skillId,
            level,
            nameLabel: nameLabel || undefined,
        };
    });

    const bounds = getTreeWorldBounds(nodes, {
        showSkillName: true,
        showTier: true,
    });

    if (!bounds) {
        const fallbackHeight = 694 + TREE_BADGE_VERTICAL_OVERFLOW_PX;
        return {
            centerNode: { x: 0, y: 0 },
            width: 701,
            height: fallbackHeight,
        };
    }

    // Expand bounds by edge buffer to prevent name badge clipping (e.g. "GLOBAL HP"
    // on left) - treeLayout width/overflow can underestimate rendered extent.
    const width =
        Math.ceil(bounds.width) +
        CAPTURE_BOUNDS_EDGE_BUFFER_PX * 2 -
        CAPTURE_BOUNDS_CROP_PX * 2;
    const height =
        Math.ceil(bounds.height) +
        CAPTURE_BOUNDS_EDGE_BUFFER_PX * 2 -
        CAPTURE_BOUNDS_CROP_PX * 2;

    const edgeOffset = CAPTURE_BOUNDS_EDGE_BUFFER_PX - CAPTURE_BOUNDS_CROP_PX;

    return {
        centerNode: {
            x: edgeOffset - bounds.minX,
            y: edgeOffset - bounds.minY,
        },
        width: Math.max(1, width),
        height: Math.max(1, height),
    };
}

/**
 * Computes bounds at call time. When bridge provides getTabs + getTreeLevels,
 * uses actual nodes + levels for accurate bounds (fixes level-sensitive capture
 * issues when all globals are at 10+). Falls back to baseTree otherwise.
 */
function getTreeVisibleBounds(bridge?: TabsCaptureBridge | null): TreeCaptureBounds {
    const tabs = bridge?.getTabs?.();
    const levelsByTab = bridge?.getTreeLevels?.();
    // #region agent log
    fetch("http://127.0.0.1:7778/ingest/3fa92bd6-575d-4985-ab8d-85d682deadfb",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"bfcb51"},body:JSON.stringify({sessionId:"bfcb51",location:"captureService.ts:getTreeVisibleBounds",message:"bounds source",data:{hasTabs:!!tabs,hasLevels:!!levelsByTab,tabsLen:tabs?.length??0,levelsLen:levelsByTab?.length??0,levelsSample:levelsByTab?.[0]?.slice?.(0,10)??null},hypothesisId:"A",timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (tabs && levelsByTab && tabs.length > 0) {
        const result = buildCaptureBoundsFromTabs(tabs, levelsByTab);
        // #region agent log
        fetch("http://127.0.0.1:7778/ingest/3fa92bd6-575d-4985-ab8d-85d682deadfb",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"bfcb51"},body:JSON.stringify({sessionId:"bfcb51",location:"captureService.ts:getTreeVisibleBounds",message:"bounds from tabs",data:{centerNode:result.centerNode,width:result.width,height:result.height},hypothesisId:"B",timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return result;
    }
    const fallback = buildCenteredCaptureBounds();
    // #region agent log
    fetch("http://127.0.0.1:7778/ingest/3fa92bd6-575d-4985-ab8d-85d682deadfb",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"bfcb51"},body:JSON.stringify({sessionId:"bfcb51",location:"captureService.ts:getTreeVisibleBounds",message:"bounds from baseTree fallback",data:{centerNode:fallback.centerNode,width:fallback.width,height:fallback.height},hypothesisId:"B",timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return fallback;
}

/** Initial value for tests; capture flow uses getTreeVisibleBounds() for accuracy. */
const TREE_VISIBLE_BOUNDS = buildCenteredCaptureBounds();

/** Max iterations before giving up waiting for tree DOM to settle (tab switch). */
const CAPTURE_READY_MAX_FRAMES = 6;
/** Consecutive frames with same signature required before we consider tree ready. */
const CAPTURE_STABLE_FRAME_COUNT = 2;
const NUM_TREES = 3;

function setInlineStyleFromComputed(
    element: HTMLElement,
    computed: CSSStyleDeclaration,
    property: string,
) {
    const value = computed.getPropertyValue(property);
    if (!value) return;
    element.style.setProperty(property, value);
}

function preserveTreeLinkStrokeStyles(
    original: HTMLElement,
    clone: HTMLElement,
) {
    // Read from original (correct cascade); write to clone. Ensures SVG link stroke
    // styles survive capture (snapdom can miss CSS for SVG).
    const origLines = original.querySelectorAll<SVGLineElement>(".tree-link");
    const cloneLines = clone.querySelectorAll<SVGLineElement>(".tree-link");
    for (let i = 0; i < origLines.length && i < cloneLines.length; i++) {
        const orig = origLines[i];
        const line = cloneLines[i];
        const computed = getComputedStyle(orig);
        const stroke = computed.stroke;
        const strokeOpacity = computed.strokeOpacity;
        const widthValue = Number.parseFloat(computed.strokeWidth);
        const strokeWidth =
            Number.isFinite(widthValue) && widthValue > 0
                ? `${widthValue}px`
                : "4px";
        const filter = computed.filter;

        if (stroke && stroke !== "none") {
            line.style.stroke = stroke;
        }
        line.style.strokeWidth = strokeWidth;
        if (strokeOpacity && strokeOpacity !== "1") {
            line.style.strokeOpacity = strokeOpacity;
        }
        if (filter && filter !== "none") {
            line.style.filter = filter;
        }
    }
}

/** CSS custom properties that drive node/wrapper/pseudo-element colors (Node.svelte). */
const NODE_WRAPPER_COLOR_VARIABLES = [
    "--hex-fill",
    "--hex-border-color",
    "--hex-border-width",
    "--node-icon-color",
    "--border-color",
    "--border-color-locked",
    "--border-color-active",
    "--border-color-maxed",
    "--bg-locked",
    "--bg-available",
    "--bg-active",
    "--bg-maxed",
    "--badge-bg",
    "--text-color",
    "--text-color-active",
    "--text-color-maxed",
    "--text-color-locked",
];

function preserveNodeVisualStyles(original: HTMLElement, clone: HTMLElement) {
    // Read from original (correct cascade); write to clone so clone has correct
    // colors/effects when snapdom runs. Inline all color-driving variables so
    // the clone does not depend on stylesheet cascade (avoids whiteish capture).
    const nodeStyleProperties = [
        "background-color",
        "border-color",
        "border-width",
        "border-style",
        "box-shadow",
        "clip-path",
        "color",
        "filter",
        "opacity",
    ];
    const nodeVariableProperties = [
        "--hex-border-color",
        "--hex-border-width",
        "--hex-fill",
        "--icon-scale",
        "--bg-locked",
        "--bg-available",
        "--bg-active",
        "--node-icon-color",
        "--border-color",
        "--border-color-locked",
        "--border-color-active",
    ];
    const badgeStyleProperties = [
        "background-color",
        "border-color",
        "border-width",
        "border-style",
        "box-shadow",
        "color",
        "filter",
        "font-family",
        "font-size",
        "font-weight",
        "line-height",
        "letter-spacing",
        "font-variant-numeric",
    ];

    const origWrappers = original.querySelectorAll<HTMLElement>(".node-wrapper");
    const cloneWrappers = clone.querySelectorAll<HTMLElement>(".node-wrapper");
    for (let i = 0; i < origWrappers.length && i < cloneWrappers.length; i++) {
        const computed = getComputedStyle(origWrappers[i]);
        const cloneWrapper = cloneWrappers[i];
        setInlineStyleFromComputed(cloneWrapper, computed, "filter");
        NODE_WRAPPER_COLOR_VARIABLES.forEach((property) =>
            setInlineStyleFromComputed(cloneWrapper, computed, property),
        );
    }

    const origNodes = original.querySelectorAll<HTMLElement>(".button.node");
    const cloneNodes = clone.querySelectorAll<HTMLElement>(".button.node");
    for (let i = 0; i < origNodes.length && i < cloneNodes.length; i++) {
        const computed = getComputedStyle(origNodes[i]);
        const node = cloneNodes[i];
        nodeStyleProperties.forEach((property) =>
            setInlineStyleFromComputed(node, computed, property),
        );
        nodeVariableProperties.forEach((property) =>
            setInlineStyleFromComputed(node, computed, property),
        );
    }

    const origBadges = original.querySelectorAll<HTMLElement>(".node-badge");
    const cloneBadges = clone.querySelectorAll<HTMLElement>(".node-badge");
    for (let i = 0; i < origBadges.length && i < cloneBadges.length; i++) {
        const computed = getComputedStyle(origBadges[i]);
        badgeStyleProperties.forEach((property) =>
            setInlineStyleFromComputed(cloneBadges[i], computed, property),
        );
    }
}

function normalizeBadgeAnchorScale(root: HTMLElement) {
    // Node.svelte uses .node-badge-icon-stack + --node-badge-scale.
    root.querySelectorAll<HTMLElement>(".node-badge-icon-stack").forEach(
        (stack) => {
            stack.style.setProperty("--node-badge-scale", "1");
        },
    );
}

/** NodeFlash animation can be frozen by capture animation disabling and appear as artifacts. */
function removeTransientNodeFlashOverlays(clone: HTMLElement) {
    clone.querySelectorAll<HTMLElement>(".node-flash").forEach((el) => {
        try {
            el.remove();
        } catch (_) {
            const parent = el.parentElement;
            if (parent) {
                try {
                    parent.removeChild(el);
                } catch (_) { }
            }
        }
    });
}

/**
 * SnapDOM materializes pseudo-elements as child spans.
 * Hide native pseudo-elements when those spans exist to avoid duplicate/offset artifacts.
 */
function addSnapdomPseudoElementGuardStyle(clone: HTMLElement) {
    const style = document.createElement("style");
    style.setAttribute("data-snapdom-pseudo-guard", "true");
    style.textContent = `
*:has(> span[data-snapdom-pseudo="::before"])::before,
*:has(> span[data-snapdom-pseudo="::after"])::after {
    content: none !important;
    display: none !important;
}
`;
    clone.appendChild(style);
}

/**
 * SnapDOM can materialize hexagon ::before/::after with wrong region colors (e.g. red
 * circle behind blue final_damage node). Force correct styles on those spans so they
 * inherit the node's --hex-border-color and --hex-fill from their parent.
 */
function addHexagonPseudoSpanStyleFix(clone: HTMLElement) {
    const style = document.createElement("style");
    style.setAttribute("data-hexagon-pseudo-fix", "true");
    style.textContent = `
.node-wrapper-hex .button.node span[data-snapdom-pseudo="::before"] {
    background: var(--hex-border-color) !important;
}
.node-wrapper-hex .button.node span[data-snapdom-pseudo="::after"] {
    background: var(--hex-fill) !important;
}
`;
    clone.appendChild(style);
}

/** Copy runtime background styles from live tree to offscreen parent so captured trees keep visual context. */
function syncCaptureBackground(parent: HTMLElement, element: HTMLElement) {
    const computed = getComputedStyle(element);
    const bgProps = [
        "background-color",
        "background-image",
        "background-size",
        "background-position",
        "background-repeat",
    ];
    for (const prop of bgProps) {
        const value = computed.getPropertyValue(prop);
        if (value) parent.style.setProperty(prop, value);
    }
}

/** Ensure node wrappers and badge stack never clip badges that sit outside the circle. */
function ensureBadgesNotClipped(clone: HTMLElement) {
    clone.querySelectorAll<HTMLElement>(".node-wrapper").forEach((el) => {
        el.style.overflow = "visible";
    });
    clone.querySelectorAll<HTMLElement>(".node-badge-icon-stack").forEach(
        (el) => {
            el.style.overflow = "visible";
        },
    );
}

function waitForAnimationFrame(): Promise<void> {
    if (
        typeof window === "undefined" ||
        typeof window.requestAnimationFrame !== "function"
    ) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve());
    });
}

/** Wait for n animation frames so the browser can commit paint (e.g. before reading getComputedStyle). */
async function waitForPaintFrames(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
        await waitForAnimationFrame();
    }
}

/** rAFs to wait after stability before cloning so live tree is fully painted. */
const PRE_CLONE_PAINT_FRAMES = 2;

/** Force reflow then wait for two animation frames (layout then paint) before toBlob. */
async function forceReflowAndWaitForPaint(element: HTMLElement): Promise<void> {
    void element.offsetHeight;
    await waitForAnimationFrame();
    await waitForAnimationFrame();
}

function getTreeCanvasSignature(element: HTMLElement): string {
    return [
        element.style.transform,
        element.childElementCount,
        element.querySelectorAll(".node-wrapper").length,
        element.querySelectorAll(".tree-link").length,
    ].join("|");
}

async function waitForStableTreeCanvas(
    bridge: TabsCaptureBridge,
    tabIndex: number,
): Promise<HTMLElement | null> {
    let stableFrames = 0;
    let previousSignature = "";

    for (let frame = 0; frame < CAPTURE_READY_MAX_FRAMES; frame++) {
        await tick();
        await waitForAnimationFrame();

        const element = bridge.getTreeCanvas();
        const isReady =
            !!element &&
            element.isConnected &&
            bridge.getActive() === tabIndex &&
            !!element.querySelector(".button.node");

        if (!isReady || !element) {
            stableFrames = 0;
            previousSignature = "";
            continue;
        }

        const signature = getTreeCanvasSignature(element);
        if (signature === previousSignature) {
            stableFrames += 1;
        } else {
            stableFrames = 1;
            previousSignature = signature;
        }

        if (stableFrames >= CAPTURE_STABLE_FRAME_COUNT) {
            return element;
        }
    }

    const fallback = bridge.getTreeCanvas();
    return fallback && fallback.isConnected ? fallback : null;
}

const SNAPDOM_OPTS = {
    type: "png" as const,
    backgroundColor: "transparent",
    cache: "disabled" as const,
    outerTransforms: false,
    outerShadows: false,
    exclude: [
        ".tree-context-menu",
        ".tooltip",
        ".context-menu",
        "[role='tooltip']",
        ".modal",
        ".overlay",
    ],
};

/** Prepares a clone of the live tree in parent (paint wait, clone, styles, reflow). Call captureParentAsBlob(parent) after. */
async function prepareTreeCloneInParent(
    element: HTMLElement,
    parent: HTMLElement,
    bounds: TreeCaptureBounds,
): Promise<void> {
    await waitForPaintFrames(PRE_CLONE_PAINT_FRAMES);

    syncCaptureBackground(parent, element);

    const clone = element.cloneNode(true) as HTMLElement;

    clone.style.transform = "none";
    clone.style.transition = "none";
    clone.style.animation = "none";
    clone.style.inset = "auto";
    clone.style.right = "auto";
    clone.style.bottom = "auto";
    clone.style.width = `${bounds.width}px`;
    clone.style.height = `${bounds.height}px`;
    clone.style.pointerEvents = "none";
    clone.style.overflow = "visible";
    clone.style.position = "absolute";
    clone.style.left = `${bounds.centerNode.x}px`;
    clone.style.top = `${bounds.centerNode.y}px`;
    clone.style.transformOrigin = "0 0";

    try {
        parent.replaceChildren(clone);
    } catch (_) {
        try {
            while (parent.firstChild) parent.removeChild(parent.firstChild);
        } catch (_) { }
        parent.appendChild(clone);
    }

    preserveTreeLinkStrokeStyles(element, clone);
    preserveNodeVisualStyles(element, clone);
    normalizeBadgeAnchorScale(clone);
    removeTransientNodeFlashOverlays(clone);
    addSnapdomPseudoElementGuardStyle(clone);
    addHexagonPseudoSpanStyleFix(clone);
    ensureBadgesNotClipped(clone);

    await forceReflowAndWaitForPaint(clone);

    // #region agent log
    (()=>{
        const wrappers=clone.querySelectorAll(".node-wrapper");
        const root=clone.querySelector(".root-wrapper");
        const first=wrappers[0];
        const origWrappers=element.querySelectorAll(".node-wrapper");
        const origFirst=origWrappers[0];
        const parentRect=parent.getBoundingClientRect();
        const cloneRect=clone.getBoundingClientRect();
        fetch("http://127.0.0.1:7778/ingest/3fa92bd6-575d-4985-ab8d-85d682deadfb",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"bfcb51"},body:JSON.stringify({sessionId:"bfcb51",location:"captureService.ts:prepareTreeCloneInParent",message:"clone layout",data:{boundsCenterNode:bounds.centerNode,boundsWidth:bounds.width,boundsHeight:bounds.height,cloneLeft:clone.style.left,cloneTop:clone.style.top,parentW:parentRect.width,parentH:parentRect.height,cloneW:cloneRect.width,cloneH:cloneRect.height,firstWrapperLeft:first?getComputedStyle(first as HTMLElement).left:null,firstWrapperTop:first?getComputedStyle(first as HTMLElement).top:null,origFirstLeft:origFirst?getComputedStyle(origFirst as HTMLElement).left:null,origFirstTop:origFirst?getComputedStyle(origFirst as HTMLElement).top:null,rootLeft:root?getComputedStyle(root as HTMLElement).left:null,rootTop:root?getComputedStyle(root as HTMLElement).top:null,wrapperCount:wrappers.length},hypothesisId:"C,D",timestamp:Date.now()})}).catch(()=>{});
    })();
    // #endregion
}

/** Captures parent's contents to PNG blob. Clears parent in finally to avoid leaking clone nodes. */
async function captureParentAsBlob(parent: HTMLElement): Promise<Blob | null> {
    try {
        return await snapdom.toBlob(parent, SNAPDOM_OPTS);
    } finally {
        try {
            parent.replaceChildren();
        } catch (_) {
            try {
                while (parent.firstChild) {
                    parent.removeChild(parent.firstChild);
                }
            } catch (_) { }
        }
    }
}

async function captureElementAsPng(
    element: HTMLElement | null | undefined,
    parent: HTMLElement,
    bridge?: TabsCaptureBridge | null,
): Promise<Blob | null> {
    if (!element || !parent) {
        console.error("Capture element is null");
        return null;
    }

    try {
        const bounds = getTreeVisibleBounds(bridge);
        await prepareTreeCloneInParent(element, parent, bounds);
        return await captureParentAsBlob(parent);
    } catch (error) {
        console.error("Failed to capture tree as PNG:", error);
        return null;
    }
}

function createAndAttachOffscreenParent(bounds: TreeCaptureBounds) {
    const parent = document.createElement("div");
    parent.style.position = "absolute";
    parent.style.left = "-9999px";
    parent.style.top = "-9999px";
    parent.style.width = `${bounds.width}px`;
    parent.style.height = `${bounds.height}px`;
    parent.style.overflow = "visible";
    parent.style.backgroundColor = "transparent";
    parent.style.pointerEvents = "none";
    parent.style.isolation = "isolate";

    document.body.appendChild(parent);
    return parent;
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image from blob"));
        };

        img.src = url;
    });
}

/** Bounding box of non-transparent pixels (alpha > 0). */
function getImageContentBounds(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
): { x: number; y: number; width: number; height: number } | null {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i + 3] > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < minX || maxY < minY) return null;
    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
    };
}

/** Crop blob to non-transparent content bounds. */
async function cropBlobToContent(blob: Blob): Promise<Blob | null> {
    const img = await blobToImage(blob);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return blob;

    ctx.drawImage(img, 0, 0);
    const bounds = getImageContentBounds(ctx, img.width, img.height);
    img.src = "";

    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return blob;

    const cropped = document.createElement("canvas");
    cropped.width = bounds.width;
    cropped.height = bounds.height;
    const cropCtx = cropped.getContext("2d", { alpha: true });
    if (!cropCtx) return blob;

    cropCtx.drawImage(
        canvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height,
    );

    return new Promise((resolve) => {
        cropped.toBlob((b) => resolve(b ?? blob), "image/png");
    });
}

async function combineTreeImagesHorizontally(
    tree1Blob: Blob,
    tree2Blob: Blob,
    tree3Blob: Blob,
): Promise<Blob | null> {
    try {
        const [cropped1, cropped2, cropped3] = await Promise.all([
            cropBlobToContent(tree1Blob),
            cropBlobToContent(tree2Blob),
            cropBlobToContent(tree3Blob),
        ]);

        const [img1, img2, img3] = await Promise.all([
            blobToImage(cropped1 ?? tree1Blob),
            blobToImage(cropped2 ?? tree2Blob),
            blobToImage(cropped3 ?? tree3Blob),
        ]);

        const spacing = 32; // half node size between trees, no outer padding
        const maxHeight = Math.max(img1.height, img2.height, img3.height);
        const totalWidth = img1.width + img2.width + img3.width + spacing * 2;
        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = maxHeight;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
            console.error("Failed to get 2D context from canvas");
            return null;
        }

        let xOffset = 0;
        ctx.drawImage(img1, xOffset, (maxHeight - img1.height) / 2);
        xOffset += img1.width + spacing;
        ctx.drawImage(img2, xOffset, (maxHeight - img2.height) / 2);
        xOffset += img2.width + spacing;
        ctx.drawImage(img3, xOffset, (maxHeight - img3.height) / 2);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    clearCanvasAndImages(ctx, canvas, img1, img2, img3);
                    resolve(null);
                    return;
                }
                clearCanvasAndImages(ctx, canvas, img1, img2, img3);
                resolve(blob);
            }, "image/png");
        });
    } catch (error) {
        console.error("Failed to combine tree images:", error);
        return null;
    }
}

function clearCanvasAndImages(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    ...imgs: (HTMLImageElement | null)[]
): void {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
    } catch (_) { }
    for (const img of imgs) {
        try {
            if (img) img.src = "";
        } catch (_) { }
    }
}

async function withCaptureState<T>(callback: () => Promise<T>): Promise<T> {
    const rootEl =
        typeof document !== "undefined" ? document.documentElement : null;
    const isFirstCall = captureInProgressCount === 0;
    incrementCapture();
    if (isFirstCall) {
        rootEl?.classList.add("snapdom-capture");
    }
    try {
        return await callback();
    } finally {
        decrementCapture();
        if (captureInProgressCount === 0) {
            rootEl?.classList.remove("snapdom-capture");
        }
    }
}

export async function captureTreeImageByIndex(
    tabIndex: number,
    bridge: TabsCaptureBridge,
    parent: HTMLElement,
): Promise<Blob | null> {
    return withCaptureState(async () => {
        if (tabIndex !== bridge.getActive()) {
            bridge.setActive(tabIndex);
            await tick();
        }

        const element = await waitForStableTreeCanvas(bridge, tabIndex);
        return await captureElementAsPng(element, parent, bridge);
    });
}

type ThreeTreeBlobs = [Blob | null, Blob | null, Blob | null];

/** Prepare all three tree clones (sequential tab switch + wait), then run the three toBlob calls in parallel. */
async function captureThreeTreeBlobs(
    bridge: TabsCaptureBridge,
): Promise<ThreeTreeBlobs> {
    const bounds = getTreeVisibleBounds(bridge);
    const parents: HTMLElement[] = [];
    for (let i = 0; i < NUM_TREES; i++) {
        parents.push(createAndAttachOffscreenParent(bounds));
    }
    const currentIndex = bridge.getActive();
    const prepared = new Array<boolean>(NUM_TREES).fill(false);

    try {
        for (let i = 0; i < NUM_TREES; i++) {
            if (i !== bridge.getActive()) {
                bridge.setActive(i);
                await tick();
            }
            const element = await waitForStableTreeCanvas(bridge, i);
            if (!element) continue;
            await prepareTreeCloneInParent(element, parents[i], bounds);
            prepared[i] = true;
        }

        const blobs = await Promise.all(
            parents.map((parent, i) =>
                prepared[i] ? captureParentAsBlob(parent) : Promise.resolve(null),
            ),
        );
        return [blobs[0] ?? null, blobs[1] ?? null, blobs[2] ?? null];
    } finally {
        bridge.setActive(currentIndex);
        for (const parent of parents) {
            try {
                document.body.removeChild(parent);
            } catch (_) { }
        }
    }
}

export async function captureCombinedTreesImage(): Promise<Blob | null> {
    const bridge = tabsBridge;
    if (!bridge) return null;

    return withCaptureState(async () => {
        const [b0, b1, b2] = await captureThreeTreeBlobs(bridge);
        if (!b0 || !b1 || !b2) return null;
        return combineTreeImagesHorizontally(b0, b1, b2);
    });
}

export type CaptureAllResult = {
    combined: Blob | null;
    trees: ThreeTreeBlobs;
};

export async function captureAllTreeImages(): Promise<CaptureAllResult | null> {
    const bridge = tabsBridge;
    if (!bridge) return null;

    return withCaptureState(async () => {
        const trees = await captureThreeTreeBlobs(bridge);
        const [b0, b1, b2] = trees;
        const combined =
            b0 && b1 && b2
                ? await combineTreeImagesHorizontally(b0, b1, b2)
                : null;
        return { combined, trees };
    });
}

