import { writable, get } from "svelte/store";
import type { BuildData } from "../buildData/encoder";
import { decodeBuildData } from "../buildData/encoder";
import type { Node } from "../../types/tree";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { applyBuildData } from "../buildData/applier";
import { activeBuildName } from "../buildPresetsStore";

export type CompareSource = "preset" | "preview" | "recommended";

export interface CompareState {
    isComparing: boolean;
    referenceBuild: BuildData | null;
    referenceLabel: string;
    referenceSource: CompareSource | null;
}

const initialState: CompareState = {
    isComparing: false,
    referenceBuild: null,
    referenceLabel: "",
    referenceSource: null,
};

export const compareState = writable<CompareState>(initialState);

export function startCompare(
    buildData: BuildData,
    name: string,
    source: CompareSource,
): void {
    compareState.set({
        isComparing: true,
        referenceBuild: {
            trees: buildData.trees.map((t) => [...t]),
            owned: buildData.owned,
        },
        referenceLabel: name,
        referenceSource: source,
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

    // Store previous active as the new reference.
    // Clear referenceSource since the reference is now a snapshot of the
    // former active build, not from any external source.
    compareState.set({
        isComparing: true,
        referenceBuild: snapshot,
        referenceLabel: currentLabel,
        referenceSource: null,
    });
}

/**
 * Decodes a build code and starts comparison. Returns true on success.
 * Shows an error toast if the build code is invalid.
 */
export function decodeAndStartCompare(
    buildCode: string,
    name: string,
    source: CompareSource,
): boolean {
    const buildData = decodeBuildData(buildCode);
    if (!buildData) return false;
    startCompare(buildData, name, source);
    return true;
}
