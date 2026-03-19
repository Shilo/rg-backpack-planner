import { get, writable, derived } from "svelte/store";
import { treeLevels } from "./treeLevelsStore";
import { techCrystalsOwned, setTechCrystalsOwned } from "./techCrystalStore";
import type { LevelsByIndex } from "../types/tree";

const MAX_HISTORY = 30;

export type Snapshot = {
    treeLevels: LevelsByIndex[];
    techCrystalsOwned: number;
    activeTreeIndex: number;
};

type UndoHistory = {
    past: Snapshot[];
    present: Snapshot | null;
    future: Snapshot[];
};

function deepCopyLevels(levels: LevelsByIndex[]): LevelsByIndex[] {
    return levels.map((arr) => [...arr]);
}

function captureSnapshot(activeTreeIndex: number): Snapshot {
    return {
        treeLevels: deepCopyLevels(get(treeLevels)),
        techCrystalsOwned: get(techCrystalsOwned),
        activeTreeIndex,
    };
}

function applySnapshot(snapshot: Snapshot): void {
    treeLevels.set(deepCopyLevels(snapshot.treeLevels));
    setTechCrystalsOwned(snapshot.techCrystalsOwned);
}

function createUndoHistoryStore() {
    const store = writable<UndoHistory>({
        past: [],
        present: null,
        future: [],
    });

    return {
        subscribe: store.subscribe,

        pushSnapshot(activeTreeIndex: number): void {
            store.update((state) => {
                const snapshot = captureSnapshot(activeTreeIndex);
                const past =
                    state.present != null
                        ? [...state.past, state.present]
                        : [...state.past];
                // FIFO eviction
                while (past.length > MAX_HISTORY) {
                    past.shift();
                }
                return { past, present: snapshot, future: [] };
            });
        },

        undo(): number | null {
            let snapshotToApply: Snapshot | null = null;
            store.update((state) => {
                if (state.past.length === 0 || state.present == null)
                    return state;
                const prev = state.past[state.past.length - 1];
                const newPast = state.past.slice(0, -1);
                snapshotToApply = prev;
                return {
                    past: newPast,
                    present: prev,
                    future: [...state.future, state.present],
                };
            });
            if (snapshotToApply != null) {
                applySnapshot(snapshotToApply);
                return (snapshotToApply as Snapshot).activeTreeIndex;
            }
            return null;
        },

        redo(): number | null {
            let snapshotToApply: Snapshot | null = null;
            store.update((state) => {
                if (state.future.length === 0 || state.present == null)
                    return state;
                const next = state.future[state.future.length - 1];
                const newFuture = state.future.slice(0, -1);
                snapshotToApply = next;
                return {
                    past: [...state.past, state.present],
                    present: next,
                    future: newFuture,
                };
            });
            if (snapshotToApply != null) {
                applySnapshot(snapshotToApply);
                return (snapshotToApply as Snapshot).activeTreeIndex;
            }
            return null;
        },

        clearHistory(activeTreeIndex: number = 0): void {
            store.set({
                past: [],
                present: captureSnapshot(activeTreeIndex),
                future: [],
            });
        },
    };
}

export const undoHistory = createUndoHistoryStore();

export const canUndo = derived(
    undoHistory,
    ($h) => $h.past.length > 0 && $h.present != null,
);

export const canRedo = derived(
    undoHistory,
    ($h) => $h.future.length > 0 && $h.present != null,
);
