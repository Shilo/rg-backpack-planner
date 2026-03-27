/**
 * Tree milestone tracking — acknowledges branch/tree completion at key thresholds.
 *
 * Each tree has 30 nodes across 3 branches (10 each). When all nodes in a branch
 * or full tree reach max level, a milestone fires. Milestones only fire once per
 * threshold crossing to avoid spam.
 */

import { derived, get } from "svelte/store";
import { treeLevels, TREE_BRANCH_KEYS, type TreeBranchKey } from "./treeLevelsStore";
import type { Node, LevelsByIndex } from "../types/tree";
import { activeTabs } from "./techCrystalStore";
import { showToast } from "./toast";
import { tr } from "svelte-whisper";
import { prefersNoAnimations } from "./reduceMotionStore";

type TreeIndex = 0 | 1 | 2;
const TREE_NAMES: Record<TreeIndex, string> = {
    0: "trees.guardian",
    1: "trees.vanguard",
    2: "trees.cannon",
};

const BRANCH_NAMES: Record<TreeBranchKey, string> = {
    yellow: "trees.branches.yellow",
    orange: "trees.branches.orange",
    blue: "trees.branches.blue",
};

const MILESTONES = [0.25, 0.5, 0.75, 1.0] as const;

type MilestoneKey = `${TreeIndex}:${string}`;

function makeBranchKey(treeIndex: TreeIndex, branch: TreeBranchKey): MilestoneKey {
    return `${treeIndex}:branch:${branch}`;
}

function makeTreeKey(treeIndex: TreeIndex): MilestoneKey {
    return `${treeIndex}:tree`;
}

/** Calculate what fraction of max levels are filled for a set of nodes */
function calculateProgress(levels: LevelsByIndex, nodes: Node[], start: number, end: number): number {
    let totalMax = 0;
    let totalLevel = 0;
    for (let i = start; i < end && i < levels.length && i < nodes.length; i++) {
        totalMax += nodes[i].maxLevel;
        totalLevel += levels[i] ?? 0;
    }
    return totalMax > 0 ? totalLevel / totalMax : 0;
}

/** Get the highest milestone threshold that progress has reached */
function getHighestMilestone(progress: number): number {
    let highest = 0;
    for (const m of MILESTONES) {
        if (progress >= m - 0.0001) highest = m; // float tolerance
    }
    return highest;
}

// Track which milestones have been acknowledged so we don't re-fire
const acknowledged = new Map<MilestoneKey, number>();

// Derived store that computes current progress for all branches and trees
export const treeProgress = derived(
    [treeLevels, activeTabs],
    ([$treeLevels, $activeTabs]) => {
        const result: Map<MilestoneKey, number> = new Map();
        if (!$activeTabs?.length) return result;

        for (let ti = 0; ti < $treeLevels.length && ti < $activeTabs.length; ti++) {
            const treeIndex = ti as TreeIndex;
            const levels = $treeLevels[ti];
            const nodes = $activeTabs[ti]?.nodes;
            if (!levels || !nodes) continue;

            // Branch progress (each branch is 10 nodes)
            for (const branch of TREE_BRANCH_KEYS) {
                const bounds = getBranchBounds(branch);
                const progress = calculateProgress(levels, nodes, bounds.start, bounds.end);
                result.set(makeBranchKey(treeIndex, branch), progress);
            }

            // Full tree progress
            const treeProgress = calculateProgress(levels, nodes, 0, nodes.length);
            result.set(makeTreeKey(treeIndex), treeProgress);
        }

        return result;
    },
);

const BRANCH_BOUNDS: Record<TreeBranchKey, { start: number; end: number }> = {
    yellow: { start: 0, end: 10 },
    orange: { start: 10, end: 20 },
    blue: { start: 20, end: 30 },
};

function getBranchBounds(branch: TreeBranchKey) {
    return BRANCH_BOUNDS[branch];
}

/** Initialize milestone tracking. Call once from App after trees are ready. */
export function initMilestoneTracking(): () => void {
    // Seed acknowledged map with current state so we don't fire on load
    const current = get(treeProgress);
    for (const [key, progress] of current) {
        const milestone = getHighestMilestone(progress);
        if (milestone > 0) acknowledged.set(key, milestone);
    }

    return treeProgress.subscribe((progressMap) => {
        for (const [key, progress] of progressMap) {
            const milestone = getHighestMilestone(progress);
            const prev = acknowledged.get(key) ?? 0;

            if (milestone > prev && milestone > 0) {
                acknowledged.set(key, milestone);

                // Only show toasts for meaningful thresholds (skip spammy ones)
                if (!prefersNoAnimations()) {
                    fireMilestoneToast(key, milestone);
                }
            }

            // Track regression (e.g., reset)
            if (milestone < prev) {
                acknowledged.set(key, milestone);
            }
        }
    });
}

function fireMilestoneToast(key: MilestoneKey, milestone: number) {
    const parts = key.split(":");
    const treeIndex = parseInt(parts[0]) as TreeIndex;
    const isTree = parts[1] === "tree";

    const treeName = tr(TREE_NAMES[treeIndex]);
    const pct = Math.round(milestone * 100);

    if (isTree && milestone === 1.0) {
        // Full tree completion — special message
        showToast(
            tr("milestones.treeComplete", { tree: treeName }),
            { durationMs: 4000 },
        );
    } else if (!isTree && milestone === 1.0) {
        // Branch completion
        const branch = parts[2] as TreeBranchKey;
        const branchName = tr(BRANCH_NAMES[branch]);
        showToast(
            tr("milestones.branchComplete", { tree: treeName, branch: branchName }),
            { durationMs: 3500 },
        );
    } else if (isTree && milestone >= 0.5) {
        // Tree 50% or 75% — toast
        showToast(
            tr("milestones.treeProgress", { tree: treeName, pct }),
            { durationMs: 3000 },
        );
    }
    // Skip branch partial milestones and tree 25% — too noisy
}

/** Reset acknowledged milestones (e.g., when switching presets) */
export function resetMilestones() {
    acknowledged.clear();
    // Re-seed from current state
    const current = get(treeProgress);
    for (const [key, progress] of current) {
        const milestone = getHighestMilestone(progress);
        if (milestone > 0) acknowledged.set(key, milestone);
    }
}
