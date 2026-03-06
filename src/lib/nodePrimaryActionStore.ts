import { writable } from "svelte/store";
import { getItem, removeItem, setItem } from "./storage";

export const NODE_PRIMARY_ACTION_INCREMENT_ONE = "increment-one";
export const NODE_PRIMARY_ACTION_INCREMENT_TEN = "increment-ten";
export const NODE_PRIMARY_ACTION_INCREMENT_TIER = "increment-tier";

export type NodePrimaryAction =
    | typeof NODE_PRIMARY_ACTION_INCREMENT_ONE
    | typeof NODE_PRIMARY_ACTION_INCREMENT_TEN
    | typeof NODE_PRIMARY_ACTION_INCREMENT_TIER;

const VALID_NODE_PRIMARY_ACTIONS = new Set<NodePrimaryAction>([
    NODE_PRIMARY_ACTION_INCREMENT_ONE,
    NODE_PRIMARY_ACTION_INCREMENT_TEN,
    NODE_PRIMARY_ACTION_INCREMENT_TIER,
]);

const STORAGE_NODE_PRIMARY_ACTION_VALUES: Record<NodePrimaryAction, number> = {
    [NODE_PRIMARY_ACTION_INCREMENT_ONE]: 1,
    [NODE_PRIMARY_ACTION_INCREMENT_TEN]: 10,
    [NODE_PRIMARY_ACTION_INCREMENT_TIER]: -1,
};

const DEFAULT_NODE_PRIMARY_ACTION = NODE_PRIMARY_ACTION_INCREMENT_ONE;

function parseNodePrimaryAction(storedValue: string | null): NodePrimaryAction | null {
    if (storedValue === null) return null;
    const parsed = Number.parseInt(storedValue, 10);
    if (!Number.isInteger(parsed)) return null;
    if (parsed === STORAGE_NODE_PRIMARY_ACTION_VALUES[NODE_PRIMARY_ACTION_INCREMENT_ONE]) {
        return NODE_PRIMARY_ACTION_INCREMENT_ONE;
    }
    if (parsed === STORAGE_NODE_PRIMARY_ACTION_VALUES[NODE_PRIMARY_ACTION_INCREMENT_TEN]) {
        return NODE_PRIMARY_ACTION_INCREMENT_TEN;
    }
    if (parsed === STORAGE_NODE_PRIMARY_ACTION_VALUES[NODE_PRIMARY_ACTION_INCREMENT_TIER]) {
        return NODE_PRIMARY_ACTION_INCREMENT_TIER;
    }
    return null;
}

function getNodePrimaryAction(): NodePrimaryAction {
    const stored = parseNodePrimaryAction(getItem("node-touch-action"));
    return stored ?? DEFAULT_NODE_PRIMARY_ACTION;
}

function setNodePrimaryAction(value: NodePrimaryAction) {
    const storedValue = STORAGE_NODE_PRIMARY_ACTION_VALUES[value];
    setItem("node-touch-action", String(storedValue));
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
