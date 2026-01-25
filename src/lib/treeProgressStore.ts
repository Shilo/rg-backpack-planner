import { get, type Unsubscriber } from "svelte/store";
import { treeLevels, type LevelsById } from "./treeLevelsStore";
import type { TreeNode } from "./Tree.svelte";

const STORAGE_KEY = "rg-backpack-planner-tree-progress";

/**
 * Compresses tree progress data by removing zero values to reduce data size.
 * Missing keys are treated as 0 when loading, so zero values can be safely omitted.
 * @param levels The tree levels to compress
 * @returns Compressed levels with zero values omitted
 */
function compressTreeProgress(levels: LevelsById[]): LevelsById[] {
    return levels.map((tree) => {
        const compressedTree: LevelsById = {};
        for (const [nodeId, level] of Object.entries(tree)) {
            if (level !== 0) {
                compressedTree[nodeId] = level;
            }
        }
        return compressedTree;
    });
}

/**
 * Expands compressed tree progress data by adding missing node IDs with 0 values.
 * This ensures the loaded data matches the expected structure with all nodes present.
 * @param compressedLevels Compressed levels (may be missing zero values)
 * @param trees Array of tree node definitions to expand against
 * @returns Expanded levels with all node IDs present
 */
function expandTreeProgress(
    compressedLevels: LevelsById[],
    trees: { nodes: TreeNode[] }[],
): LevelsById[] {
    if (compressedLevels.length !== trees.length) {
        return compressedLevels;
    }
    
    return compressedLevels.map((compressedTree, index) => {
        const tree = trees[index];
        if (!tree) return compressedTree;
        
        // Start with the compressed data, then add missing nodes as 0
        const expanded: LevelsById = { ...compressedTree };
        for (const node of tree.nodes) {
            if (!(node.id in expanded)) {
                expanded[node.id] = 0;
            }
        }
        return expanded;
    });
}

/**
 * Loads saved tree progress from localStorage
 * If trees are provided, automatically expands compressed data (adds missing zeros).
 * @param trees Optional array of tree node definitions to expand against
 * @returns The saved progress (expanded if trees provided) or null if not found/invalid
 */
export function loadTreeProgress(
    trees?: { nodes: TreeNode[] }[],
): LevelsById[] | null {
    if (typeof window === "undefined") return null;
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const parsed = JSON.parse(stored) as LevelsById[];
        
        // Validate structure: must be an array of objects
        if (
            Array.isArray(parsed) &&
            parsed.every((tree) => typeof tree === "object" && tree !== null)
        ) {
            // If trees are provided, expand compressed data automatically
            if (trees) {
                return expandTreeProgress(parsed, trees);
            }
            return parsed;
        }
        
        return null;
    } catch (error) {
        console.error("Failed to load tree progress from localStorage:", error);
        return null;
    }
}

/**
 * Saves tree progress to localStorage
 * Optimizes storage by omitting zero values to reduce data size
 * @param levels The tree levels to save
 */
export function saveTreeProgress(levels: LevelsById[]): void {
    if (typeof window === "undefined") return;
    
    try {
        // Compress data by removing zero values - missing keys are treated as 0 on load
        const compressed = compressTreeProgress(levels);
        const serialized = JSON.stringify(compressed);
        localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
        // Handle quota exceeded or other storage errors gracefully
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
            console.warn("localStorage quota exceeded, unable to save tree progress");
        } else {
            console.error("Failed to save tree progress to localStorage:", error);
        }
    }
}

/**
 * Initializes automatic persistence of tree progress
 * Subscribes to treeLevels store and saves on every change
 * Saves even when all levels are 0 (reset state) to ensure consistency
 * @returns Unsubscriber function to stop auto-saving
 */
export function initTreeProgressPersistence(): Unsubscriber {
    return treeLevels.subscribe((levels) => {
        // Only save if we have levels (trees are initialized)
        if (levels.length === 0) return;
        
        // Always save, including reset state (all zeros), to ensure persistence
        // is consistent with the current state
        saveTreeProgress(levels);
    });
}

