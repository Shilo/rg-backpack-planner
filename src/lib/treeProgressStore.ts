import { get, type Unsubscriber } from "svelte/store";
import { treeLevels } from "./treeLevelsStore";
import { isPreviewMode } from "./previewModeStore";
import type { Node, LevelsByIndex } from "../types/tree";

const STORAGE_KEY = "rg-backpack-planner-tree-progress";

type FlatLevels = number[];

function flattenTreeLevels(levels: LevelsByIndex[]): FlatLevels {
  const flat: FlatLevels = [];
  for (const tree of levels) {
    for (const value of tree) {
      flat.push(value ?? 0);
    }
  }
  return flat;
}

function trimTrailingZeros(levels: FlatLevels): FlatLevels {
  let lastNonZero = -1;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i] !== 0) {
      lastNonZero = i;
      break;
    }
  }
  return lastNonZero === -1 ? [] : levels.slice(0, lastNonZero + 1);
}

function unflattenTreeLevels(
  flat: FlatLevels,
  trees: { nodes: Node[] }[],
): LevelsByIndex[] {
  const result: LevelsByIndex[] = [];
  let offset = 0;

  for (const tree of trees) {
    const nodeCount = tree.nodes.length;
    const levels: LevelsByIndex = new Array(nodeCount);
    for (let i = 0; i < nodeCount; i++) {
      const idx = offset + i;
      levels[i] = idx < flat.length ? flat[idx] ?? 0 : 0;
    }
    offset += nodeCount;
    result.push(levels);
  }

  return result;
}

/**
 * Expands compressed tree progress using tree structure.
 * Pads or truncates to match each tree's node count; missing indices get 0.
 * @param compressedLevels Compressed levels (trailing zeros omitted)
 * @param trees Array of tree node definitions to expand against
 * @returns Expanded levels arrays, or [] if length mismatch
 */
export function expandTreeProgress(
  compressedLevels: LevelsByIndex[],
  trees: { nodes: Node[] }[],
): LevelsByIndex[] {
  if (compressedLevels.length !== trees.length) return [];

  return compressedLevels.map((compressedTree, index) => {
    const tree = trees[index];
    if (!tree) return [];

    const nodeCount = tree.nodes.length;
    const expanded: LevelsByIndex = new Array(nodeCount);
    for (let i = 0; i < nodeCount; i++) {
      expanded[i] = compressedTree[i] ?? 0;
    }
    return expanded;
  });
}

/**
 * Loads saved tree progress from localStorage and expands using tree structure.
 * @param trees Array of tree node definitions to expand against
 * @returns Expanded progress or null if not found/invalid
 */
export function loadTreeProgress(
  trees: { nodes: Node[] }[],
): LevelsByIndex[] | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "number")) {
      // Old data format or invalid; ignore
      return null;
    }

    const expanded = unflattenTreeLevels(parsed as FlatLevels, trees);
    return expanded.length > 0 ? expanded : null;
  } catch (error) {
    console.error("Failed to load tree progress from localStorage:", error);
    return null;
  }
}

/**
 * Loads raw tree progress from localStorage (parse only, no expand).
 * Use for summing spent etc. when trees are not available.
 */
export function loadTreeProgressRaw(): FlatLevels | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "number")) {
      return null;
    }
    return parsed as FlatLevels;
  } catch (error) {
    console.error("Failed to load tree progress from localStorage:", error);
    return null;
  }
}

/**
 * Saves tree progress to localStorage
 * Optimizes storage by trimming trailing zeros to reduce data size
 * @param levels The tree levels to save
 */
export function saveTreeProgress(levels: LevelsByIndex[]): void {
  if (typeof window === "undefined") return;

  try {
    const flat = flattenTreeLevels(levels);
    const trimmed = trimTrailingZeros(flat);
    const serialized = JSON.stringify(trimmed);
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
 * Skips saving when in preview mode (URL builds should not affect localStorage)
 * @returns Unsubscriber function to stop auto-saving
 */
export function initTreeProgressPersistence(): Unsubscriber {
  return treeLevels.subscribe((levels) => {
    // Only save if we have levels (trees are initialized)
    if (levels.length === 0) return;

    // Skip saving if in preview mode (URL builds are public, not personal)
    if (get(isPreviewMode)) return;

    // Always save, including reset state (all zeros), to ensure persistence
    // is consistent with the current state
    saveTreeProgress(levels);
  });
}

