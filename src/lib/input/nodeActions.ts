import type { InputAction } from "./inputAction";
import type { NodeIndex } from "../../types/tree";

export type NodeOperation =
    | { op: "incrementByStore" }
    | { op: "decrementByStore" }
    | { op: "incrementByAlternate" }
    | { op: "decrementByAlternate" }
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
 * Direction: isDecrement = auxiliary OR reverse (OR semantics, no cancel-out).
 * Amount: alternate toggles between +1 and +Tier based on primary action store.
 * Secondary always maps to contextMenu.
 */
export function resolveNodeAction(
    action: InputAction,
): NodeOperation {
    if (action.type === "secondary") {
        return { op: "contextMenu" };
    }

    const isDecrement = action.type === "auxiliary" || action.modifiers.reverse;
    const isAlternate = action.modifiers.alternate;

    if (isAlternate) {
        return { op: isDecrement ? "decrementByAlternate" : "incrementByAlternate" };
    }
    return { op: isDecrement ? "decrementByStore" : "incrementByStore" };
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
        case "incrementByAlternate":
            callbacks.incrementByAlternate(index);
            break;
        case "decrementByAlternate":
            callbacks.decrementByAlternate(index);
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
    incrementByAlternate: (index: NodeIndex) => void;
    decrementByAlternate: (index: NodeIndex) => void;
    contextMenu: (index: NodeIndex, pos: { x: number; y: number }) => void;
};
