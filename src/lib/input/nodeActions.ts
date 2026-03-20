import type { InputAction } from "./inputAction";
import type { NodeIndex } from "../../types/tree";

export type NodeOperation =
    | { op: "incrementByStore" }
    | { op: "decrementByStore" }
    | { op: "incrementTier" }
    | { op: "decrementTier" }
    | { op: "incrementOne" }
    | { op: "decrementOne" }
    | { op: "contextMenu" };

export type TreeBackgroundOperation =
    | { op: "contextMenu" }
    | { op: "focusInView" };

export type TabOperation =
    | { op: "activate" }
    | { op: "contextMenu" };

export type RootOperation =
    | { op: "openQuickSettings" };

/**
 * Maps an InputAction to a concrete NodeOperation.
 * Direction is determined by button (primary=increment, auxiliary=decrement).
 * Modifiers override amount: macro=tier, micro=+1.
 * Secondary always maps to contextMenu.
 */
export function resolveNodeAction(
    action: InputAction,
): NodeOperation {
    if (action.type === "secondary") {
        return { op: "contextMenu" };
    }

    const isIncrement = action.type === "primary";

    if (action.modifier === "macro") {
        return { op: isIncrement ? "incrementTier" : "decrementTier" };
    }
    if (action.modifier === "micro") {
        return { op: isIncrement ? "incrementOne" : "decrementOne" };
    }

    return { op: isIncrement ? "incrementByStore" : "decrementByStore" };
}

/**
 * Dispatches a NodeOperation to the appropriate callback.
 * Called by Tree.svelte after resolving through the pipeline.
 */
export function applyNodeOperation(
    op: NodeOperation,
    index: NodeIndex,
    callbacks: NodeOperationCallbacks,
    pos?: { x: number; y: number },
): void {
    switch (op.op) {
        case "incrementByStore":
            callbacks.incrementByStore(index);
            break;
        case "decrementByStore":
            callbacks.decrementByStore(index);
            break;
        case "incrementTier":
            callbacks.incrementTier(index);
            break;
        case "decrementTier":
            callbacks.decrementTier(index);
            break;
        case "incrementOne":
            callbacks.incrementOne(index);
            break;
        case "decrementOne":
            callbacks.decrementOne(index);
            break;
        case "contextMenu":
            if (!pos) throw new Error("contextMenu requires pos");
            callbacks.contextMenu(index, pos);
            break;
    }
}

export type NodeOperationCallbacks = {
    incrementByStore: (index: NodeIndex) => void;
    decrementByStore: (index: NodeIndex) => void;
    incrementTier: (index: NodeIndex) => void;
    decrementTier: (index: NodeIndex) => void;
    incrementOne: (index: NodeIndex) => void;
    decrementOne: (index: NodeIndex) => void;
    contextMenu: (index: NodeIndex, pos: { x: number; y: number }) => void;
};
