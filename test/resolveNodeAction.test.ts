import assert from "node:assert/strict";
import { resolveNodeAction } from "../src/lib/input/nodeActions.ts";
import type { InputAction } from "../src/lib/input/inputAction.ts";

console.log("  resolveNodeAction");

const NONE = { reverse: false, alternate: false };
const REV = { reverse: true, alternate: false };
const ALT = { reverse: false, alternate: true };
const BOTH = { reverse: true, alternate: true };

// --- Primary, no modifiers → incrementByStore ---
{
    const action: InputAction = { type: "primary", modifiers: NONE, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "incrementByStore" });
    console.log("    ✓ primary + none → incrementByStore");
}

// --- Primary, reverse → decrementByStore ---
{
    const action: InputAction = { type: "primary", modifiers: REV, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByStore" });
    console.log("    ✓ primary + reverse → decrementByStore");
}

// --- Primary, alternate → incrementByAlternate ---
{
    const action: InputAction = { type: "primary", modifiers: ALT, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "incrementByAlternate" });
    console.log("    ✓ primary + alternate → incrementByAlternate");
}

// --- Primary, reverse + alternate → decrementByAlternate ---
{
    const action: InputAction = { type: "primary", modifiers: BOTH, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByAlternate" });
    console.log("    ✓ primary + reverse + alternate → decrementByAlternate");
}

// --- Auxiliary, no modifiers → decrementByStore (inherently reverse) ---
{
    const action: InputAction = { type: "auxiliary", modifiers: NONE, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByStore" });
    console.log("    ✓ auxiliary + none → decrementByStore");
}

// --- Auxiliary, reverse → decrementByStore (Shift redundant with middle click) ---
{
    const action: InputAction = { type: "auxiliary", modifiers: REV, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByStore" });
    console.log("    ✓ auxiliary + reverse → decrementByStore (Shift redundant)");
}

// --- Auxiliary, alternate → decrementByAlternate ---
{
    const action: InputAction = { type: "auxiliary", modifiers: ALT, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByAlternate" });
    console.log("    ✓ auxiliary + alternate → decrementByAlternate");
}

// --- Auxiliary, reverse + alternate → decrementByAlternate (Shift redundant) ---
{
    const action: InputAction = { type: "auxiliary", modifiers: BOTH, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByAlternate" });
    console.log("    ✓ auxiliary + reverse + alternate → decrementByAlternate (Shift redundant)");
}

// --- Secondary always → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifiers: NONE, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "contextMenu" });
    console.log("    ✓ secondary → contextMenu");
}

// --- Secondary with modifiers still → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifiers: BOTH, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "contextMenu" });
    console.log("    ✓ secondary + modifiers → contextMenu (modifiers ignored)");
}

// --- Touch primary → incrementByStore (modifiers forced to none by resolveAction) ---
{
    const action: InputAction = { type: "primary", modifiers: NONE, device: "touch" };
    assert.deepEqual(resolveNodeAction(action), { op: "incrementByStore" });
    console.log("    ✓ touch primary → incrementByStore");
}

console.log("  ✓ resolveNodeAction\n");
