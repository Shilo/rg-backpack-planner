import assert from "node:assert/strict";
import { resolveModifiers, resolveAction } from "../src/lib/input/resolveAction.ts";
import type { InputState } from "../src/lib/input/inputStore.ts";
import { DEFAULT_MODIFIER_KEY_MAP } from "../src/lib/input/modifierKeyMap.ts";

console.log("  resolveModifiers");

// --- No keys held → both false ---
{
    const state: InputState = { shiftKey: false, ctrlKey: false };
    assert.deepEqual(resolveModifiers(state, DEFAULT_MODIFIER_KEY_MAP), { reverse: false, alternate: false });
    console.log("    ✓ no keys held returns { reverse: false, alternate: false }");
}

// --- Shift held → reverse only ---
{
    const state: InputState = { shiftKey: true, ctrlKey: false };
    assert.deepEqual(resolveModifiers(state, DEFAULT_MODIFIER_KEY_MAP), { reverse: true, alternate: false });
    console.log("    ✓ shift held returns { reverse: true, alternate: false }");
}

// --- Ctrl held → alternate only ---
{
    const state: InputState = { shiftKey: false, ctrlKey: true };
    assert.deepEqual(resolveModifiers(state, DEFAULT_MODIFIER_KEY_MAP), { reverse: false, alternate: true });
    console.log("    ✓ ctrl held returns { reverse: false, alternate: true }");
}

// --- Both held → both true (independent, no priority) ---
{
    const state: InputState = { shiftKey: true, ctrlKey: true };
    assert.deepEqual(resolveModifiers(state, DEFAULT_MODIFIER_KEY_MAP), { reverse: true, alternate: true });
    console.log("    ✓ both held returns { reverse: true, alternate: true }");
}

console.log("  ✓ resolveModifiers\n");

console.log("  resolveAction");

const NONE = { reverse: false, alternate: false };
const REV = { reverse: true, alternate: false };
const ALT = { reverse: false, alternate: true };
const BOTH = { reverse: true, alternate: true };

// --- Button 0, mouse, no modifiers → primary ---
{
    const result = resolveAction(0, NONE, "mouse");
    assert.deepEqual(result, { type: "primary", modifiers: NONE, device: "mouse" });
    console.log("    ✓ button 0, mouse, none → primary");
}

// --- Button 0, mouse, reverse → primary with reverse ---
{
    const result = resolveAction(0, REV, "mouse");
    assert.deepEqual(result, { type: "primary", modifiers: REV, device: "mouse" });
    console.log("    ✓ button 0, mouse, reverse → primary with reverse");
}

// --- Button 1, mouse → auxiliary ---
{
    const result = resolveAction(1, NONE, "mouse");
    assert.deepEqual(result, { type: "auxiliary", modifiers: NONE, device: "mouse" });
    console.log("    ✓ button 1, mouse → auxiliary");
}

// --- Button 1, mouse, alternate → auxiliary with alternate ---
{
    const result = resolveAction(1, ALT, "mouse");
    assert.deepEqual(result, { type: "auxiliary", modifiers: ALT, device: "mouse" });
    console.log("    ✓ button 1, mouse, alternate → auxiliary with alternate");
}

// --- Button 2, mouse → secondary ---
{
    const result = resolveAction(2, NONE, "mouse");
    assert.deepEqual(result, { type: "secondary", modifiers: NONE, device: "mouse" });
    console.log("    ✓ button 2, mouse → secondary");
}

// --- Button 0, touch → primary, modifiers forced to none ---
{
    const result = resolveAction(0, REV, "touch");
    assert.deepEqual(result, { type: "primary", modifiers: NONE, device: "touch" });
    console.log("    ✓ button 0, touch → primary, modifiers forced to none");
}

// --- Button 1, touch → null (no auxiliary on touch) ---
{
    const result = resolveAction(1, NONE, "touch");
    assert.equal(result, null);
    console.log("    ✓ button 1, touch → null");
}

// --- Button 2, touch → secondary ---
{
    const result = resolveAction(2, NONE, "touch");
    assert.deepEqual(result, { type: "secondary", modifiers: NONE, device: "touch" });
    console.log("    ✓ button 2, touch → secondary");
}

// --- Pen normalized to mouse ---
{
    const result = resolveAction(0, ALT, "pen");
    assert.deepEqual(result, { type: "primary", modifiers: ALT, device: "mouse" });
    console.log("    ✓ pen normalized to mouse");
}

// --- Unknown button → null ---
{
    const result = resolveAction(3, NONE, "mouse");
    assert.equal(result, null);
    console.log("    ✓ button 3 → null");
}

// --- Empty pointerType treated as mouse ---
{
    const result = resolveAction(0, NONE, "");
    assert.deepEqual(result, { type: "primary", modifiers: NONE, device: "mouse" });
    console.log("    ✓ empty pointerType treated as mouse");
}

// --- Both modifiers, button 0 → primary with both ---
{
    const result = resolveAction(0, BOTH, "mouse");
    assert.deepEqual(result, { type: "primary", modifiers: BOTH, device: "mouse" });
    console.log("    ✓ both modifiers, button 0 → primary with both");
}

console.log("  ✓ resolveAction\n");
