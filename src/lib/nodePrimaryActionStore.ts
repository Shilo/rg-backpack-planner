import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

export enum NodePrimaryAction {
    IncrementOne = 0,
    IncrementTen = 1,
    IncrementTier = 2,
}

const DEFAULT_NODE_PRIMARY_ACTION = NodePrimaryAction.IncrementOne;

export function isNodePrimaryAction(value: number): value is NodePrimaryAction {
    return Number.isInteger(value) && value in NodePrimaryAction;
}

function parseNodePrimaryAction(storedValue: string | null): NodePrimaryAction | null {
    if (storedValue === null) return null;
    const parsed = Number.parseInt(storedValue, 10);
    return isNodePrimaryAction(parsed) ? parsed : null;
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
            if (!isNodePrimaryAction(value)) return;
            setNodePrimaryAction(value);
            set(value);
        },
        resetToDefault: () => {
            setNodePrimaryAction(DEFAULT_NODE_PRIMARY_ACTION);
            set(DEFAULT_NODE_PRIMARY_ACTION);
        },
    };
}

export const nodePrimaryAction = createNodePrimaryActionStore();
