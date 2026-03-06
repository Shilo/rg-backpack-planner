import { writable } from "svelte/store";
import { getItem, removeItem, setItem } from "./storage";

export const NODE_PRIMARY_ACTION_INCREMENT_ONE = 0;
export const NODE_PRIMARY_ACTION_INCREMENT_TEN = 1;
export const NODE_PRIMARY_ACTION_INCREMENT_TIER = 2;

export type NodePrimaryAction = 0 | 1 | 2;

const VALID_NODE_PRIMARY_ACTIONS = new Set<NodePrimaryAction>([
    NODE_PRIMARY_ACTION_INCREMENT_ONE,
    NODE_PRIMARY_ACTION_INCREMENT_TEN,
    NODE_PRIMARY_ACTION_INCREMENT_TIER,
]);

const DEFAULT_NODE_PRIMARY_ACTION = NODE_PRIMARY_ACTION_INCREMENT_ONE;

function parseNodePrimaryAction(storedValue: string | null): NodePrimaryAction | null {
    if (storedValue === null) return null;
    const parsed = Number.parseInt(storedValue, 10);
    if (!Number.isInteger(parsed)) return null;
    return VALID_NODE_PRIMARY_ACTIONS.has(parsed as NodePrimaryAction)
        ? (parsed as NodePrimaryAction)
        : null;
}

function getNodePrimaryAction(): NodePrimaryAction {
    const stored = parseNodePrimaryAction(getItem("node-touch-action"));
    return stored ?? DEFAULT_NODE_PRIMARY_ACTION;
}

function setNodePrimaryAction(value: NodePrimaryAction) {
    setItem("node-touch-action", String(value));
}

function createNodePrimaryActionStore() {
    const { subscribe, set } = writable(getNodePrimaryAction());

    return {
        subscribe,
        set: (value: NodePrimaryAction) => {
            if (!VALID_NODE_PRIMARY_ACTIONS.has(value)) return;
            setNodePrimaryAction(value);
            set(value);
        },
        resetToDefault: () => {
            removeItem("node-touch-action");
            setNodePrimaryAction(DEFAULT_NODE_PRIMARY_ACTION);
            set(DEFAULT_NODE_PRIMARY_ACTION);
        },
    };
}

export const nodePrimaryAction = createNodePrimaryActionStore();
