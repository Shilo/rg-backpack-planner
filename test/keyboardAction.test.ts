import assert from "node:assert/strict";
import { canonicalKey, resolveKeyboardAction, KEYBOARD_ACTION_BINDINGS, isKeyboardAction, getCycleDirection, keyForAction } from "../src/lib/input/keyboardAction.ts";
import type { KeyboardActionType } from "../src/lib/input/keyboardAction.ts";

// --- canonicalKey ---
console.log("  canonicalKey");

{
    assert.equal(canonicalKey("z"), "z");
    assert.equal(canonicalKey("Z"), "z", "uppercase Z normalized to z");
    assert.equal(canonicalKey("b"), "b");
    assert.equal(canonicalKey("B"), "b", "uppercase B normalized to b");
    assert.equal(canonicalKey("`"), "`");
    assert.equal(canonicalKey(" "), " ");
    assert.equal(canonicalKey("Escape"), "Escape", "named keys pass through");
    assert.equal(canonicalKey("ArrowLeft"), "ArrowLeft");
    assert.equal(canonicalKey("F9"), "F9");
    console.log("    ✓ normalizes single-char keys to lowercase, passes named keys through");
}

console.log("  ✓ canonicalKey\n");

// --- resolveKeyboardAction ---
console.log("  resolveKeyboardAction");

function mockEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
        key: "",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        ...overrides,
    } as KeyboardEvent;
}

// Basic action bindings
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Escape" })), "dismiss");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Backspace" })), "back");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Tab" })), "cycle");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "ArrowLeft" })), "cycle");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "ArrowRight" })), "cycle");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Enter" })), "confirm");
    assert.notEqual(resolveKeyboardAction(mockEvent({ key: "Enter" })), "activate", "Enter resolves to confirm, not activate");
    assert.equal(resolveKeyboardAction(mockEvent({ key: " " })), "activate");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "`" })), "console");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "F9" })), "screenshot");
    console.log("    ✓ basic action bindings");
}

// Undo: Ctrl+Z (no shift, no alt)
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true })), "undo");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", metaKey: true })), "undo");
    console.log("    ✓ Ctrl+Z and Meta+Z → undo");
}

// Undo blocked by shift or alt
{
    assert.notEqual(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true, shiftKey: true })), "undo");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true, altKey: true })), null);
    console.log("    ✓ Ctrl+Shift+Z → not undo, Ctrl+Alt+Z → null");
}

// Redo: Ctrl+Y, Ctrl+Shift+Z
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "y", ctrlKey: true })), "redo");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true, shiftKey: true })), "redo");
    console.log("    ✓ Ctrl+Y and Ctrl+Shift+Z → redo");
}

// Redo blocked by alt
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "y", ctrlKey: true, altKey: true })), null);
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true, shiftKey: true, altKey: true })), null);
    console.log("    ✓ Ctrl+Alt+Y and Ctrl+Alt+Shift+Z → null");
}

// Budget: b without Ctrl
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "b" })), "budget");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "b", ctrlKey: true })), null, "Ctrl+B should not trigger budget");
    console.log("    ✓ b → budget, Ctrl+B → null");
}

// Caps Lock bugfix: Z without shift should still be undo when Ctrl held
{
    assert.equal(
        resolveKeyboardAction(mockEvent({ key: "Z", ctrlKey: true, shiftKey: false })),
        "undo",
        "Caps Lock + Ctrl+Z (event.key='Z', shiftKey=false) should resolve to undo",
    );
    console.log("    ✓ Caps Lock + Ctrl+Z → undo (bugfix)");
}

// Caps Lock bugfix: B without Ctrl should be budget
{
    assert.equal(
        resolveKeyboardAction(mockEvent({ key: "B" })),
        "budget",
        "Caps Lock + B (event.key='B') should resolve to budget",
    );
    console.log("    ✓ Caps Lock + B → budget (bugfix)");
}

// Unknown key → null
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "x" })), null);
    assert.equal(resolveKeyboardAction(mockEvent({ key: "F1" })), null);
    console.log("    ✓ unknown keys → null");
}

// Dismiss works regardless of modifiers held
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Escape", ctrlKey: true })), "dismiss");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Escape", shiftKey: true, altKey: true })), "dismiss");
    console.log("    ✓ Escape resolves to dismiss regardless of modifiers");
}

// KEYBOARD_ACTION_BINDINGS is a frozen/readonly array
{
    assert.ok(Array.isArray(KEYBOARD_ACTION_BINDINGS), "bindings is an array");
    assert.ok(KEYBOARD_ACTION_BINDINGS.length > 0, "bindings is not empty");
    console.log("    ✓ KEYBOARD_ACTION_BINDINGS is a non-empty array");
}

console.log("  ✓ resolveKeyboardAction\n");

// --- isKeyboardAction ---
console.log("  isKeyboardAction");

{
    // dismiss
    assert.equal(isKeyboardAction(mockEvent({ key: "Escape" }), "dismiss"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "dismiss"), false);
    // confirm = Enter only
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "confirm"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: " " }), "confirm"), false, "Space is NOT confirm");
    // activate = Enter + Space
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "activate"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: " " }), "activate"), true);
    // cycle
    assert.equal(isKeyboardAction(mockEvent({ key: "Tab" }), "cycle"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "ArrowLeft" }), "cycle"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "ArrowRight" }), "cycle"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "cycle"), false);
    // undo respects modifiers
    assert.equal(isKeyboardAction(mockEvent({ key: "z", ctrlKey: true }), "undo"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "z" }), "undo"), false, "z without Ctrl is not undo");
    assert.equal(isKeyboardAction(mockEvent({ key: "z", ctrlKey: true, shiftKey: true }), "undo"), false, "Ctrl+Shift+Z is not undo");
    // canonicalKey: Caps Lock B → budget
    assert.equal(isKeyboardAction(mockEvent({ key: "B" }), "budget"), true);
    console.log("    ✓ isKeyboardAction matches action bindings correctly");
}

console.log("  ✓ isKeyboardAction\n");

// --- getCycleDirection ---
console.log("  getCycleDirection");

{
    assert.equal(getCycleDirection(mockEvent({ key: "Tab" })), 1);
    assert.equal(getCycleDirection(mockEvent({ key: "Tab", shiftKey: true })), -1);
    assert.equal(getCycleDirection(mockEvent({ key: "ArrowLeft" })), -1);
    assert.equal(getCycleDirection(mockEvent({ key: "ArrowRight" })), 1);
    console.log("    ✓ getCycleDirection returns correct direction");
}

console.log("  ✓ getCycleDirection\n");

// --- keyForAction ---
console.log("  keyForAction");

{
    assert.equal(keyForAction("dismiss"), "Escape");
    assert.equal(keyForAction("confirm"), "Enter");
    assert.equal(keyForAction("cycle"), "Tab");
    // Every action in KEYBOARD_ACTION_BINDINGS should return a non-empty string
    const allActions: KeyboardActionType[] = [
        "dismiss", "back", "cycle", "confirm", "activate", "console", "undo", "redo", "screenshot", "budget",
    ];
    for (const action of allActions) {
        assert.ok(keyForAction(action).length > 0, `keyForAction("${action}") should return a non-empty string`);
    }
    console.log("    ✓ keyForAction returns first bound key for each action");
}

console.log("  ✓ keyForAction\n");
