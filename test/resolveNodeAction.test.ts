import assert from "node:assert/strict";
import { resolveNodeAction } from "../src/lib/input/nodeActions.ts";
import type { InputAction } from "../src/lib/input/inputAction.ts";

console.log("  resolveNodeAction");

// --- Primary, none → incrementByStore ---
{
    const action: InputAction = { type: "primary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "incrementByStore" });
    console.log("    ✓ primary + none → incrementByStore");
}

// --- Primary, macro → incrementTier ---
{
    const action: InputAction = { type: "primary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "incrementTier" });
    console.log("    ✓ primary + macro → incrementTier");
}

// --- Primary, micro → incrementOne ---
{
    const action: InputAction = { type: "primary", modifier: "micro", device: "mouse" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "incrementOne" });
    console.log("    ✓ primary + micro → incrementOne");
}

// --- Auxiliary, none → decrementByStore ---
{
    const action: InputAction = { type: "auxiliary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "decrementByStore" });
    console.log("    ✓ auxiliary + none → decrementByStore");
}

// --- Auxiliary, macro → decrementTier ---
{
    const action: InputAction = { type: "auxiliary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "decrementTier" });
    console.log("    ✓ auxiliary + macro → decrementTier");
}

// --- Auxiliary, micro → decrementOne ---
{
    const action: InputAction = { type: "auxiliary", modifier: "micro", device: "mouse" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "decrementOne" });
    console.log("    ✓ auxiliary + micro → decrementOne");
}

// --- Secondary always → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "contextMenu" });
    console.log("    ✓ secondary → contextMenu");
}

// --- Secondary with modifier still → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "contextMenu" });
    console.log("    ✓ secondary + macro → contextMenu (modifiers ignored)");
}

// --- Touch primary → incrementByStore (modifier forced to none by resolveAction) ---
{
    const action: InputAction = { type: "primary", modifier: "none", device: "touch" };
    const result = resolveNodeAction(action);
    assert.deepEqual(result, { op: "incrementByStore" });
    console.log("    ✓ touch primary → incrementByStore");
}

// --- Modifier actions are fixed (not store-dependent) ---
{
    const action: InputAction = { type: "primary", modifier: "macro", device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "incrementTier" });
    console.log("    ✓ modifier actions are fixed (not store-dependent)");
}

console.log("  ✓ resolveNodeAction\n");
