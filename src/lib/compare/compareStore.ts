import { writable, get } from "svelte/store";
import {
    encodeBuildData,
    decodeBuildData,
    type BuildData,
} from "../buildData/encoder";
import type { Node } from "../../types/tree";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { switchActivePreset } from "../buildData/applier";
import {
    activeBuildName,
    getActivePresetId,
    setActivePresetId,
} from "../buildPresetsStore";
import { isPreviewMode } from "../previewModeStore";
import {
    getEncodedFromUrl,
    navigateToEncodedBuild,
    navigateToPersonalMode,
} from "../buildData/url";
import { setActiveTab } from "../sideMenuActiveTabStore";
import { requestOpenSideMenu } from "../sideMenuOpenStore";

export type CompareBuildSource =
    | { type: "preset"; id: string }
    | { type: "preview"; encoded: string };

export interface CompareBuild {
    data: BuildData;
    label: string;
    source: CompareBuildSource;
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

function startCompare(
    buildData: BuildData,
    name: string,
    source: CompareBuildSource,
): void {
    const currentLevels = get(treeLevels);
    const currentOwned = get(techCrystalsOwned);
    const currentLabel = get(activeBuildName);

    const currentSource: CompareBuildSource = get(isPreviewMode)
        ? {
              type: "preview",
              encoded:
                  getEncodedFromUrl() ??
                  encodeBuildData({ trees: currentLevels, owned: currentOwned }),
          }
        : { type: "preset", id: getActivePresetId() };

    compareState.set({
        isComparing: true,
        buildA: {
            data: {
                trees: currentLevels.map((t) => [...t]),
                owned: currentOwned,
            },
            label: currentLabel,
            source: currentSource,
        },
        buildB: {
            data: {
                trees: buildData.trees.map((t) => [...t]),
                owned: buildData.owned,
            },
            label: name,
            source,
        },
        activeSide: "a",
    });

    setActiveTab("statistics");
    requestOpenSideMenu();
}

export function stopCompare(): void {
    compareState.set(initialState);
}

export function swapBuilds(trees: { nodes: Node[] }[]): void {
    const state = get(compareState);
    if (!state.isComparing || !state.buildA || !state.buildB) return;

    // Snapshot current live build into the departing side before switching
    const currentLevels = get(treeLevels);
    const currentOwned = get(techCrystalsOwned);
    const snapshot: BuildData = {
        trees: currentLevels.map((t) => [...t]),
        owned: currentOwned,
    };

    const newActiveSide = state.activeSide === "a" ? "b" : "a";

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

    const targetSource =
        newActiveSide === "a" ? state.buildA.source : state.buildB.source;

    if (targetSource.type === "preview") {
        // Any → Preview: triggers hashchange → initializeFromUrl enters preview mode
        navigateToEncodedBuild(targetSource.encoded);
    } else if (get(isPreviewMode)) {
        // Preview → Preset: set active preset ID first so initializeFromUrl loads it,
        // then clear the URL hash and dispatch hashchange to exit preview mode
        setActivePresetId(targetSource.id);
        navigateToPersonalMode();
    } else {
        // Personal → Preset: direct switch, no navigation needed
        switchActivePreset(targetSource.id, trees);
    }
}

/**
 * Updates the label and source of the currently active side without touching the frozen
 * reference. Call this when the active build changes outside of the comparison swap flow
 * (e.g. the user switches presets or navigates to a new preview build while comparing).
 * No-op if not currently comparing.
 */
export function updateActiveSide(
    label: string,
    source: CompareBuildSource,
): void {
    compareState.update((state) => {
        if (!state.isComparing || !state.buildA || !state.buildB) return state;
        if (state.activeSide === "a") {
            return { ...state, buildA: { ...state.buildA, label, source } };
        } else {
            return { ...state, buildB: { ...state.buildB, label, source } };
        }
    });
}

/**
 * Decodes a build code and starts comparison. Returns true on success.
 */
export function decodeAndStartCompare(
    buildCode: string,
    name: string,
    source: CompareBuildSource,
): boolean {
    const buildData = decodeBuildData(buildCode);
    if (!buildData) return false;
    startCompare(buildData, name, source);
    return true;
}
