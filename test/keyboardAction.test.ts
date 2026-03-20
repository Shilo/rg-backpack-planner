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

// cyclePrimaryAction: a without Ctrl
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "a" })), "cyclePrimaryAction");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "a", ctrlKey: true })), null, "Ctrl+A should not trigger cyclePrimaryAction");
    console.log("    ✓ a → cyclePrimaryAction, Ctrl+A → null");
}

// Caps Lock bugfix: A without Ctrl should be cyclePrimaryAction
{
    assert.equal(
        resolveKeyboardAction(mockEvent({ key: "A" })),
        "cyclePrimaryAction",
        "Caps Lock + A (event.key='A') should resolve to cyclePrimaryAction",
    );
    console.log("    ✓ Caps Lock + A → cyclePrimaryAction (bugfix)");
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

// Negated activate pattern (!isKeyboardAction used in ContextMenu, ModalHost, SegmentedControl, ColorPickerDialog)
{
    assert.equal(isKeyboardAction(mockEvent({ key: "Escape" }), "activate"), false);
    assert.equal(isKeyboardAction(mockEvent({ key: "Tab" }), "activate"), false);
    assert.equal(isKeyboardAction(mockEvent({ key: "Backspace" }), "activate"), false);
    assert.equal(isKeyboardAction(mockEvent({ key: "x" }), "activate"), false);
    console.log("    ✓ non-activate keys return false (negation guard)");
}

// Remaining actions: back, console, redo, screenshot
{
    assert.equal(isKeyboardAction(mockEvent({ key: "Backspace" }), "back"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "back"), false);
    assert.equal(isKeyboardAction(mockEvent({ key: "`" }), "console"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "console"), false);
    assert.equal(isKeyboardAction(mockEvent({ key: "y", ctrlKey: true }), "redo"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "z", ctrlKey: true, shiftKey: true }), "redo"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "y" }), "redo"), false, "y without Ctrl is not redo");
    assert.equal(isKeyboardAction(mockEvent({ key: "F9" }), "screenshot"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "F1" }), "screenshot"), false);
    console.log("    ✓ isKeyboardAction covers back, console, redo, screenshot");
}

// Dismiss ignores modifiers (mirrors resolveKeyboardAction test)
{
    assert.equal(isKeyboardAction(mockEvent({ key: "Escape", ctrlKey: true }), "dismiss"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "Escape", shiftKey: true, altKey: true }), "dismiss"), true);
    console.log("    ✓ isKeyboardAction dismiss ignores modifiers");
}

// Budget blocked by Ctrl
{
    assert.equal(isKeyboardAction(mockEvent({ key: "b" }), "budget"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "b", ctrlKey: true }), "budget"), false, "Ctrl+B is not budget");
    console.log("    ✓ isKeyboardAction budget respects ctrl constraint");
}

// cyclePrimaryAction blocked by Ctrl
{
    assert.equal(isKeyboardAction(mockEvent({ key: "a" }), "cyclePrimaryAction"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "a", ctrlKey: true }), "cyclePrimaryAction"), false, "Ctrl+A is not cyclePrimaryAction");
    assert.equal(isKeyboardAction(mockEvent({ key: "A" }), "cyclePrimaryAction"), true, "Caps Lock + A is cyclePrimaryAction");
    console.log("    ✓ isKeyboardAction cyclePrimaryAction respects ctrl constraint");
}

// focusTrap: Tab only (distinct from cycle which also matches ArrowLeft/ArrowRight)
{
    assert.equal(isKeyboardAction(mockEvent({ key: "Tab" }), "focusTrap"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "Tab", shiftKey: true }), "focusTrap"), true, "Shift+Tab is also focusTrap");
    assert.equal(isKeyboardAction(mockEvent({ key: "ArrowLeft" }), "focusTrap"), false, "ArrowLeft is NOT focusTrap");
    assert.equal(isKeyboardAction(mockEvent({ key: "ArrowRight" }), "focusTrap"), false, "ArrowRight is NOT focusTrap");
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "focusTrap"), false);
    console.log("    ✓ isKeyboardAction focusTrap matches Tab only, not arrows");
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
    assert.equal(keyForAction("back"), "Backspace");
    assert.equal(keyForAction("cycle"), "Tab");
    assert.equal(keyForAction("confirm"), "Enter");
    assert.equal(keyForAction("activate"), "Enter");
    assert.equal(keyForAction("console"), "`");
    assert.equal(keyForAction("undo"), "z");
    assert.equal(keyForAction("redo"), "y");
    assert.equal(keyForAction("screenshot"), "F9");
    assert.equal(keyForAction("budget"), "b");
    assert.equal(keyForAction("focusTrap"), "Tab");
    assert.equal(keyForAction("cyclePrimaryAction"), "a");
    // Every action in KEYBOARD_ACTION_BINDINGS should return a non-empty string
    const allActions: KeyboardActionType[] = [
        "dismiss", "back", "cycle", "confirm", "activate", "console", "undo", "redo", "screenshot", "budget", "focusTrap", "cyclePrimaryAction",
    ];
    for (const action of allActions) {
        assert.ok(keyForAction(action).length > 0, `keyForAction("${action}") should return a non-empty string`);
    }
    // Unknown action throws
    assert.throws(
        () => keyForAction("nonexistent" as KeyboardActionType),
        { message: /No key binding for action/ },
    );
    console.log("    ✓ keyForAction returns first bound key for each action");
}

console.log("  ✓ keyForAction\n");
