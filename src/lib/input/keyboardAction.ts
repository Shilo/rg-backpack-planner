/**
 * Semantic names for keyboard actions, analogous to pointer InputActionType.
 *
 * dismiss    — Escape (close menu, cancel, back out)
 * back       — Backspace (undo last step, reset state)
 * cycle      — Tab / ← / → (cycle between tabs/sections)
 * confirm    — Enter (form submission, input finalization)
 * activate   — Enter / Space (button clicks, selections, menu item activation)
 * console    — ` (backtick / tilde — toggle overlay panel, e.g. quick settings)
 * undo       — Ctrl+Z
 * redo       — Ctrl+Y / Ctrl+Shift+Z
 * screenshot — F9
 * budget     — B (open tech crystal budget modal)
 */
export type KeyboardActionType =
    | "dismiss"
    | "back"
    | "cycle"
    | "confirm"
    | "activate"
    | "console"
    | "undo"
    | "redo"
    | "screenshot"
    | "budget";

/** All KeyboardEvent.key values used in the app, in canonical form. */
export const Key = {
    Escape: "Escape",
    Backspace: "Backspace",
    Tab: "Tab",
    Enter: "Enter",
    Space: " ",
    Backtick: "`",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    Shift: "Shift",
    Control: "Control",
    F9: "F9",
    z: "z",
    y: "y",
    b: "b",
} as const;

/**
 * Returns the canonical form of a KeyboardEvent.key value.
 * Lowercases single-character keys so comparisons are
 * independent of Caps Lock or Shift casing.
 */
export function canonicalKey(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
}

export type KeyBinding = {
    action: KeyboardActionType;
    key: string;
    /** true = require Ctrl/Meta, false = require NO Ctrl/Meta, undefined = either */
    ctrl?: boolean;
    /** true = require Shift, false = require NO Shift, undefined = either */
    shift?: boolean;
    /** true = require Alt, false = require NO Alt, undefined = either */
    alt?: boolean;
};

export const KEYBOARD_ACTION_BINDINGS: readonly KeyBinding[] = [
    { action: "dismiss", key: Key.Escape },
    { action: "back", key: Key.Backspace },
    { action: "cycle", key: Key.Tab },
    { action: "cycle", key: Key.ArrowLeft },
    { action: "cycle", key: Key.ArrowRight },
    { action: "confirm", key: Key.Enter },
    { action: "activate", key: Key.Enter },
    { action: "activate", key: Key.Space },
    { action: "console", key: Key.Backtick },
    { action: "undo", key: Key.z, ctrl: true, shift: false, alt: false },
    { action: "redo", key: Key.y, ctrl: true, alt: false },
    { action: "redo", key: Key.z, ctrl: true, shift: true, alt: false },
    { action: "screenshot", key: Key.F9 },
    { action: "budget", key: Key.b, ctrl: false },
];

/**
 * Maps a keyboard event to a semantic KeyboardActionType.
 * Returns null for unrecognized or unhandled key combinations.
 */
export function resolveKeyboardAction(
    event: KeyboardEvent,
): KeyboardActionType | null {
    const { ctrlKey, metaKey, shiftKey, altKey } = event;
    const ctrl = ctrlKey || metaKey;
    const key = canonicalKey(event.key);

    for (const binding of KEYBOARD_ACTION_BINDINGS) {
        if (binding.key !== key) continue;
        if (binding.ctrl !== undefined && binding.ctrl !== ctrl) continue;
        if (binding.shift !== undefined && binding.shift !== shiftKey) continue;
        if (binding.alt !== undefined && binding.alt !== altKey) continue;
        return binding.action;
    }
    return null;
}

/**
 * Checks whether a keyboard event matches a specific action's key binding(s).
 * Respects modifier constraints defined in KEYBOARD_ACTION_BINDINGS.
 */
export function isKeyboardAction(
    event: KeyboardEvent,
    action: KeyboardActionType,
): boolean {
    const { ctrlKey, metaKey, shiftKey, altKey } = event;
    const ctrl = ctrlKey || metaKey;
    const key = canonicalKey(event.key);

    for (const binding of KEYBOARD_ACTION_BINDINGS) {
        if (binding.action !== action) continue;
        if (binding.key !== key) continue;
        if (binding.ctrl !== undefined && binding.ctrl !== ctrl) continue;
        if (binding.shift !== undefined && binding.shift !== shiftKey) continue;
        if (binding.alt !== undefined && binding.alt !== altKey) continue;
        return true;
    }
    return false;
}

/**
 * Returns the cycle direction for a cycle keyboard event.
 * ArrowLeft / Shift+Tab → -1 (backward), ArrowRight / Tab → 1 (forward).
 * Only meaningful when called on events that match the "cycle" action.
 */
export function getCycleDirection(event: KeyboardEvent): 1 | -1 {
    const key = canonicalKey(event.key);
    if (key === Key.ArrowLeft) return -1;
    if (key === Key.ArrowRight) return 1;
    return event.shiftKey ? -1 : 1;
}

/**
 * Returns the first bound key string for the given action.
 * Used for constructing synthetic keyboard events.
 */
export function keyForAction(action: KeyboardActionType): string {
    const binding = KEYBOARD_ACTION_BINDINGS.find(b => b.action === action);
    if (!binding) {
        throw new Error(`No key binding for action "${action}"`);
    }
    return binding.key;
}
