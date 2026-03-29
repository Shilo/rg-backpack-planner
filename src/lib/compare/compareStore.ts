import { writable, get } from "svelte/store";
import type { BuildData } from "../buildData/encoder";
import { decodeBuildData } from "../buildData/encoder";
import type { Node } from "../../types/tree";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { applyBuildData } from "../buildData/applier";
import { activeBuildName } from "../buildPresetsStore";

export interface CompareState {
    isComparing: boolean;
    referenceBuild: BuildData | null;
    referenceLabel: string;
}

const initialState: CompareState = {
    isComparing: false,
    referenceBuild: null,
    referenceLabel: "",
};

export const compareState = writable<CompareState>(initialState);

function startCompare(buildData: BuildData, name: string): void {
    compareState.set({
        isComparing: true,
        referenceBuild: {
            trees: buildData.trees.map((t) => [...t]),
            owned: buildData.owned,
        },
        referenceLabel: name,
    });
}

export function stopCompare(): void {
    compareState.set(initialState);
}

export function swapBuilds(trees: { nodes: Node[] }[]): void {
    const state = get(compareState);
    if (!state.isComparing || !state.referenceBuild) return;

    // Snapshot current active build
    const currentLevels = get(treeLevels);
    const currentOwned = get(techCrystalsOwned);
    const currentLabel = get(activeBuildName);
    const snapshot: BuildData = {
        trees: currentLevels.map((t) => [...t]),
        owned: currentOwned,
    };

    // Apply reference build as the new active build
    applyBuildData(trees, state.referenceBuild);

    // Store previous active as the new reference
    compareState.set({
        isComparing: true,
        referenceBuild: snapshot,
        referenceLabel: currentLabel,
    });
}

/**
 * Decodes a build code and starts comparison. Returns true on success.
 */
export function decodeAndStartCompare(
    buildCode: string,
    name: string,
): boolean {
    const buildData = decodeBuildData(buildCode);
    if (!buildData) return false;
    startCompare(buildData, name);
    return true;
}
