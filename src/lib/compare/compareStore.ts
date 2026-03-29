import { writable, get } from "svelte/store";
import type { BuildData } from "../buildData/encoder";
import { decodeBuildData } from "../buildData/encoder";
import type { Node } from "../../types/tree";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { applyBuildData } from "../buildData/applier";
import { activeBuildName } from "../buildPresetsStore";
import { setActiveTab } from "../sideMenuActiveTabStore";

export interface CompareBuild {
    data: BuildData;
    label: string;
}

export interface CompareState {
    isComparing: boolean;
    /** Left segment — the build that was active when comparison started */
    buildA: CompareBuild | null;
    /** Right segment — the build chosen to compare against */
    buildB: CompareBuild | null;
    /** Which segment is currently the live/editable build */
    activeSide: "a" | "b";
}

const initialState: CompareState = {
    isComparing: false,
    buildA: null,
    buildB: null,
    activeSide: "a",
};

export const compareState = writable<CompareState>(initialState);

function startCompare(buildData: BuildData, name: string): void {
    const currentLevels = get(treeLevels);
    const currentOwned = get(techCrystalsOwned);
    const currentLabel = get(activeBuildName);

    compareState.set({
        isComparing: true,
        buildA: {
            data: {
                trees: currentLevels.map((t) => [...t]),
                owned: currentOwned,
            },
            label: currentLabel,
        },
        buildB: {
            data: {
                trees: buildData.trees.map((t) => [...t]),
                owned: buildData.owned,
            },
            label: name,
        },
        activeSide: "a",
    });

    setActiveTab("statistics");
}

export function stopCompare(): void {
    compareState.set(initialState);
}

export function swapBuilds(trees: { nodes: Node[] }[]): void {
    const state = get(compareState);
    if (!state.isComparing || !state.buildA || !state.buildB) return;

    // Snapshot current live build into the departing side
    const currentLevels = get(treeLevels);
    const currentOwned = get(techCrystalsOwned);
    const snapshot: BuildData = {
        trees: currentLevels.map((t) => [...t]),
        owned: currentOwned,
    };

    const newActiveSide = state.activeSide === "a" ? "b" : "a";

    // Apply the target side's stored data
    const targetData =
        newActiveSide === "a" ? state.buildA.data : state.buildB.data;
    applyBuildData(trees, targetData);

    // Save snapshot into the departing side
    const updatedBuildA =
        state.activeSide === "a"
            ? { ...state.buildA, data: snapshot }
            : state.buildA;
    const updatedBuildB =
        state.activeSide === "b"
            ? { ...state.buildB, data: snapshot }
            : state.buildB;

    compareState.set({
        isComparing: true,
        buildA: updatedBuildA,
        buildB: updatedBuildB,
        activeSide: newActiveSide,
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
