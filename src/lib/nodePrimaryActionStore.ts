import { writable } from "svelte/store";
import type { SkillId } from "../types/tree";
import { getCostRange } from "../config/skillMetadata";
import {
    nextTierTargetLevel,
    previousTierTargetLevel,
} from "./tierLeveling";
import { getItem, setItem } from "./storage";

export { shiftKeyHeld } from "./inputStore";

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

/**
 * Returns the tech crystal cost for the primary action (or its opposite when
 * isRefund is true, i.e. shift+click refund). Returns null if skillId is
 * missing, no upgrade/refund possible, or already at max/zero.
 */
export function getPrimaryActionCost(
    action: NodePrimaryAction,
    skillId: SkillId | null,
    level: number,
    maxLevel: number,
    isRefund = false,
): number | null {
    if (skillId == null) return null;
    const ml = maxLevel as 100 | 50 | 1;
    if (isRefund) {
        if (level <= 0) return null;
        const fromLevel =
            action === NodePrimaryAction.IncrementOne
                ? Math.max(0, level - 1)
                : action === NodePrimaryAction.IncrementTen
                  ? Math.max(0, level - 10)
                  : previousTierTargetLevel(level, ml);
        if (fromLevel >= level) return null;
        return getCostRange(skillId, fromLevel, level);
    }
    if (level >= maxLevel) return null;
    const toLevel =
        action === NodePrimaryAction.IncrementOne
            ? Math.min(level + 1, maxLevel)
            : action === NodePrimaryAction.IncrementTen
              ? Math.min(level + 10, maxLevel)
              : nextTierTargetLevel(level, ml);
    if (toLevel <= level) return null;
    return getCostRange(skillId, level, toLevel);
}
