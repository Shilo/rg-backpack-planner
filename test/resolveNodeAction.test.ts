import assert from "node:assert/strict";
import { resolveNodeAction } from "../src/lib/input/nodeActions.ts";
import type { InputAction } from "../src/lib/input/inputAction.ts";
import { NodePrimaryAction } from "../src/lib/nodePrimaryActionStore.ts";

console.log("  resolveNodeAction");

// --- Primary, none → incrementByStore ---
{
    const action: InputAction = { type: "primary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "incrementByStore" });
    console.log("    ✓ primary + none → incrementByStore");
}

// --- Primary, macro → incrementTier ---
{
    const action: InputAction = { type: "primary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "incrementTier" });
    console.log("    ✓ primary + macro → incrementTier");
}

// --- Primary, micro → incrementOne ---
{
    const action: InputAction = { type: "primary", modifier: "micro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "incrementOne" });
    console.log("    ✓ primary + micro → incrementOne");
}

// --- Auxiliary, none → decrementByStore ---
{
    const action: InputAction = { type: "auxiliary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementTen);
    assert.deepEqual(result, { op: "decrementByStore" });
    console.log("    ✓ auxiliary + none → decrementByStore");
}

// --- Auxiliary, macro → decrementTier ---
{
    const action: InputAction = { type: "auxiliary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementTen);
    assert.deepEqual(result, { op: "decrementTier" });
    console.log("    ✓ auxiliary + macro → decrementTier");
}

// --- Auxiliary, micro → decrementOne ---
{
    const action: InputAction = { type: "auxiliary", modifier: "micro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementTen);
    assert.deepEqual(result, { op: "decrementOne" });
    console.log("    ✓ auxiliary + micro → decrementOne");
}

// --- Secondary always → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "contextMenu" });
    console.log("    ✓ secondary → contextMenu");
}

// --- Secondary with modifier still → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "contextMenu" });
    console.log("    ✓ secondary + macro → contextMenu (modifiers ignored)");
}

// --- Touch primary → incrementByStore (modifier forced to none by resolveAction) ---
{
    const action: InputAction = { type: "primary", modifier: "none", device: "touch" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementTier);
    assert.deepEqual(result, { op: "incrementByStore" });
    console.log("    ✓ touch primary → incrementByStore");
}

// --- Result independent of NodePrimaryAction for modifier actions ---
{
    const action: InputAction = { type: "primary", modifier: "macro", device: "mouse" };
    const r1 = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    const r2 = resolveNodeAction(action, NodePrimaryAction.IncrementTen);
    const r3 = resolveNodeAction(action, NodePrimaryAction.IncrementTier);
    assert.deepEqual(r1, { op: "incrementTier" });
    assert.deepEqual(r2, { op: "incrementTier" });
    assert.deepEqual(r3, { op: "incrementTier" });
    console.log("    ✓ modifier actions are fixed regardless of store value");
}

console.log("  ✓ resolveNodeAction\n");
