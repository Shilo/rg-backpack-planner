import { get, writable, derived } from "svelte/store";
import { treeLevels } from "./treeLevelsStore";
import { techCrystalsOwned, setTechCrystalsOwned } from "./techCrystalStore";
import type { LevelsByIndex } from "../types/tree";

const MAX_HISTORY = 50;

export type Snapshot = {
    treeLevels: LevelsByIndex[];
    techCrystalsOwned: number;
    activeTreeIndex: number;
};

export type UndoRedoResult = {
    activeTreeIndex: number;
    apply: () => void;
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
            const result = this.undoDeferred();
            if (result == null) return null;
            result.apply();
            return result.activeTreeIndex;
        },

        redo(): number | null {
            const result = this.redoDeferred();
            if (result == null) return null;
            result.apply();
            return result.activeTreeIndex;
        },

        /** Like undo(), but does not apply the snapshot. Caller must call result.apply(). */
        undoDeferred(): UndoRedoResult | null {
            let snapshotToApply: Snapshot | null = null;
            let actionTreeIndex: number | null = null;
            store.update((state) => {
                if (state.past.length === 0 || state.present == null)
                    return state;
                const prev = state.past[state.past.length - 1];
                const newPast = state.past.slice(0, -1);
                snapshotToApply = prev;
                actionTreeIndex = state.present.activeTreeIndex;
                return {
                    past: newPast,
                    present: prev,
                    future: [...state.future, state.present],
                };
            });
            if (snapshotToApply != null && actionTreeIndex != null) {
                const snap = snapshotToApply as Snapshot;
                return {
                    activeTreeIndex: actionTreeIndex,
                    apply: () => applySnapshot(snap),
                };
            }
            return null;
        },

        /** Like redo(), but does not apply the snapshot. Caller must call result.apply(). */
        redoDeferred(): UndoRedoResult | null {
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
                const snap = snapshotToApply as Snapshot;
                return {
                    activeTreeIndex: snap.activeTreeIndex,
                    apply: () => applySnapshot(snap),
                };
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

        getState(): UndoHistory {
            return get(store);
        },

        restoreState(state: UndoHistory): void {
            store.set(state);
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
