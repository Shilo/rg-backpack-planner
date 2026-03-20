import assert from "node:assert/strict";
import { resolveModifier, resolveAction } from "../src/lib/input/resolveAction.ts";
import type { InputState } from "../src/lib/inputStore.ts";
import { DEFAULT_MODIFIER_KEY_MAP } from "../src/lib/input/modifierKeyMap.ts";

console.log("  resolveModifier");

// --- No keys held → "none" ---
{
    const state: InputState = { shiftKey: false, ctrlKey: false };
    assert.equal(resolveModifier(state, DEFAULT_MODIFIER_KEY_MAP), "none");
    console.log("    ✓ no keys held returns 'none'");
}

// --- Shift held → "macro" ---
{
    const state: InputState = { shiftKey: true, ctrlKey: false };
    assert.equal(resolveModifier(state, DEFAULT_MODIFIER_KEY_MAP), "macro");
    console.log("    ✓ shift held returns 'macro'");
}

// --- Ctrl held → "micro" ---
{
    const state: InputState = { shiftKey: false, ctrlKey: true };
    assert.equal(resolveModifier(state, DEFAULT_MODIFIER_KEY_MAP), "micro");
    console.log("    ✓ ctrl held returns 'micro'");
}

// --- Both held → "macro" wins ---
{
    const state: InputState = { shiftKey: true, ctrlKey: true };
    assert.equal(resolveModifier(state, DEFAULT_MODIFIER_KEY_MAP), "macro");
    console.log("    ✓ both held returns 'macro' (macro priority)");
}

console.log("  ✓ resolveModifier\n");

console.log("  resolveAction");

// --- Button 0, mouse, no modifier → primary ---
{
    const result = resolveAction(0, "none", "mouse");
    assert.deepEqual(result, { type: "primary", modifier: "none", device: "mouse" });
    console.log("    ✓ button 0, mouse, none → primary");
}

// --- Button 0, mouse, macro → primary with macro ---
{
    const result = resolveAction(0, "macro", "mouse");
    assert.deepEqual(result, { type: "primary", modifier: "macro", device: "mouse" });
    console.log("    ✓ button 0, mouse, macro → primary with macro");
}

// --- Button 1, mouse → auxiliary ---
{
    const result = resolveAction(1, "none", "mouse");
    assert.deepEqual(result, { type: "auxiliary", modifier: "none", device: "mouse" });
    console.log("    ✓ button 1, mouse → auxiliary");
}

// --- Button 1, mouse, macro → auxiliary with macro ---
{
    const result = resolveAction(1, "macro", "mouse");
    assert.deepEqual(result, { type: "auxiliary", modifier: "macro", device: "mouse" });
    console.log("    ✓ button 1, mouse, macro → auxiliary with macro");
}

// --- Button 2, mouse → secondary ---
{
    const result = resolveAction(2, "none", "mouse");
    assert.deepEqual(result, { type: "secondary", modifier: "none", device: "mouse" });
    console.log("    ✓ button 2, mouse → secondary");
}

// --- Button 0, touch → primary, modifier forced to none ---
{
    const result = resolveAction(0, "macro", "touch");
    assert.deepEqual(result, { type: "primary", modifier: "none", device: "touch" });
    console.log("    ✓ button 0, touch → primary, modifier forced to none");
}

// --- Button 1, touch → null (no auxiliary on touch) ---
{
    const result = resolveAction(1, "none", "touch");
    assert.equal(result, null);
    console.log("    ✓ button 1, touch → null");
}

// --- Button 2, touch → secondary ---
{
    const result = resolveAction(2, "none", "touch");
    assert.deepEqual(result, { type: "secondary", modifier: "none", device: "touch" });
    console.log("    ✓ button 2, touch → secondary");
}

// --- Pen normalized to mouse ---
{
    const result = resolveAction(0, "macro", "pen");
    assert.deepEqual(result, { type: "primary", modifier: "macro", device: "mouse" });
    console.log("    ✓ pen normalized to mouse");
}

// --- Unknown button → null ---
{
    const result = resolveAction(3, "none", "mouse");
    assert.equal(result, null);
    console.log("    ✓ button 3 → null");
}

// --- Unknown pointerType treated as mouse ---
{
    const result = resolveAction(0, "none", "");
    assert.deepEqual(result, { type: "primary", modifier: "none", device: "mouse" });
    console.log("    ✓ empty pointerType treated as mouse");
}

console.log("  ✓ resolveAction\n");
