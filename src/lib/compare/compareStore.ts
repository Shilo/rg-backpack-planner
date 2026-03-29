import { writable, get } from "svelte/store";
import type { BuildData } from "../buildData/encoder";
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

    // Store previous active as the new reference
    compareState.set({
        isComparing: true,
        referenceBuild: snapshot,
        referenceLabel: currentLabel,
        referenceSource: state.referenceSource,
    });
}
