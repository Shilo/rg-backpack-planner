import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

export enum NodeLevelBehavior {
    Solo = 0,
    Sync = 1,
}

const DEFAULT_NODE_LEVEL_BEHAVIOR = NodeLevelBehavior.Sync;

export function isNodeLevelBehavior(value: number): value is NodeLevelBehavior {
    return Number.isInteger(value) && value in NodeLevelBehavior;
}

function parseNodeLevelBehavior(storedValue: string | null): NodeLevelBehavior | null {
    if (storedValue === null) return null;
    const parsed = Number.parseInt(storedValue, 10);
    return isNodeLevelBehavior(parsed) ? parsed : null;
}

function getNodeLevelBehavior(): NodeLevelBehavior {
    const stored = parseNodeLevelBehavior(getItem("node-level-behavior"));
    return stored ?? DEFAULT_NODE_LEVEL_BEHAVIOR;
}

function setNodeLevelBehavior(value: NodeLevelBehavior) {
    setItem("node-level-behavior", String(value));
}

function createNodeLevelBehaviorStore() {
    const { subscribe, set } = writable(getNodeLevelBehavior());

    return {
        subscribe,
        set: (value: NodeLevelBehavior) => {
            if (!isNodeLevelBehavior(value)) return;
            setNodeLevelBehavior(value);
            set(value);
        },
        resetToDefault: () => {
            setNodeLevelBehavior(DEFAULT_NODE_LEVEL_BEHAVIOR);
            set(DEFAULT_NODE_LEVEL_BEHAVIOR);
        },
    };
}

export const nodeLevelBehavior = createNodeLevelBehaviorStore();
