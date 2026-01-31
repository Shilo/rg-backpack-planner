/**
 * Build data application to stores
 * Handles applying build data from URL to the application state
 */

import type { BuildData } from "./encoder";
import type { Node } from "../../types/tree";
import { treeLevels, setTreeLevels } from "../treeLevelsStore";
import { setTechCrystalsOwned } from "../techCrystalStore";
import { recalculateTechCrystalsSpent } from "../techCrystalStore";
import { expandTreeProgress } from "../treeProgressStore";
import { loadBuildFromUrl } from "./url";
import { setIsApplyingBuildFromUrl } from "./url";
import { setPreviewBuildName, clearPreviewBuildName } from "../previewBuildNameStore";
import { get } from "svelte/store";

/**
 * Applies build data to tree levels and tech crystals owned (no URL or preview name).
 * Used when switching presets or initializing personal mode from presets.
 */
export function applyBuildData(
  trees: { nodes: Node[] }[],
  buildData: BuildData,
): boolean {
  try {
    let expandedTrees = buildData.trees;
    if (trees.length === buildData.trees.length) {
      expandedTrees = expandTreeProgress(buildData.trees, trees);
    }

    const currentTrees = get(treeLevels);
    if (expandedTrees.length === currentTrees.length) {
      expandedTrees.forEach((tree, index) => {
        setTreeLevels(index, tree);
      });
    } else {
      console.warn(
        `Build data has ${expandedTrees.length} trees, but current app has ${currentTrees.length} trees. Skipping tree levels.`,
      );
      return false;
    }

    setTechCrystalsOwned(buildData.owned);
    recalculateTechCrystalsSpent(expandedTrees);
    return true;
  } catch (error) {
    console.error("Failed to apply build data:", error);
    return false;
  }
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
    // Expand compressed tree data if trees are provided
    let expandedTrees = data.trees;
    if (trees && data.trees.length === trees.length) {
      expandedTrees = expandTreeProgress(data.trees, trees);
    }

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

    // Apply tech crystals owned
    setTechCrystalsOwned(data.owned);

    // Store build name if present
    if (data.name) {
      setPreviewBuildName(data.name);
    } else {
      clearPreviewBuildName();
    }

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
