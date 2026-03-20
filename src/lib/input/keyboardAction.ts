/**
 * Semantic names for keyboard actions, analogous to pointer InputActionType.
 *
 * dismiss  — Escape (close menu, cancel, back out)
 * back     — Backspace (undo last step, reset state)
 * cycle    — Tab / ← / → (cycle between tabs/sections)
 * confirm  — Enter / Space (activate, submit)
 * console  — ` (backtick / tilde — toggle overlay panel, e.g. quick settings)
 * undo     — Ctrl+Z
 * redo     — Ctrl+Y / Ctrl+Shift+Z
 * screenshot — F9
 */
export type KeyboardActionType =
    | "dismiss"
    | "back"
    | "cycle"
    | "confirm"
    | "console"
    | "undo"
    | "redo"
    | "screenshot";

/**
 * Maps a keyboard event to a semantic KeyboardActionType.
 * Returns null for unrecognized or unhandled keys.
 */
export function resolveKeyboardAction(
    event: KeyboardEvent,
): KeyboardActionType | null {
    const { key, ctrlKey, metaKey, shiftKey } = event;
    const mod = ctrlKey || metaKey;

    if (key === "Escape") return "dismiss";
    if (key === "Backspace") return "back";
    if (key === "Tab") return "cycle";
    if (key === "Enter" || key === " ") return "confirm";
    if (key === "`") return "console";
    if (mod && key === "z" && !shiftKey) return "undo";
    if (mod && (key === "y" || (key === "z" && shiftKey) || (key === "Z" && shiftKey))) return "redo";
    if (key === "F9") return "screenshot";
    return null;
}
