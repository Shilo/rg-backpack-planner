/**
 * Build data application to stores
 * Handles applying build data from URL to the application state
 */

import type { BuildData } from "./encoder";
import type { Node, LevelsByIndex } from "../../types/tree";
import { treeLevels, setTreeLevels } from "../treeLevelsStore";
import { setTechCrystalsOwned } from "../techCrystalStore";
import { loadBuildFromUrl } from "./url";
import { setIsApplyingBuildFromUrl } from "./url";
import { get } from "svelte/store";

function unflattenLevelsToTrees(
  flat: number[],
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
 * Applies build data from URL to the stores
 * Expands compressed tree data using tree definitions
 * @param trees Optional array of tree node definitions to expand against
 * @param buildData Optional pre-loaded build data to avoid duplicate loading
 * @returns true if build was successfully applied, false otherwise
 */
export function applyBuildFromUrl(
  trees?: { nodes: Node[] }[],
  buildData?: BuildData | null,
): boolean {
  // Use provided buildData if available, otherwise load from URL
  const data = buildData ?? loadBuildFromUrl();
  if (!data) return false;

  // Set flag to prevent URL updates during build application
  setIsApplyingBuildFromUrl(true);

  try {
    // Expand flat levels to per-tree arrays if trees are provided
    if (trees) {
      const expandedTrees = unflattenLevelsToTrees(data.levels, trees);

      // Apply tree levels
      const currentTrees = get(treeLevels);
      if (expandedTrees.length === currentTrees.length) {
        expandedTrees.forEach((tree, index) => {
          setTreeLevels(index, tree);
        });
      } else {
        console.warn(
          `Build data has ${expandedTrees.length} trees, but current app has ${currentTrees.length} trees. Skipping tree levels.`
        );
      }
    }

    // Apply tech crystals owned
    setTechCrystalsOwned(data.owned);

    return true;
  } catch (error) {
    console.error("Failed to apply build from URL:", error);
    return false;
  } finally {
    // Reset flag after a brief delay to allow store updates to settle
    setTimeout(() => {
      setIsApplyingBuildFromUrl(false);
    }, 100);
  }
}
