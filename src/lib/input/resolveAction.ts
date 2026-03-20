import type { InputAction, InputModifier, PointerDevice } from "./inputAction";
import type { InputState } from "./inputStore";
import type { ModifierKeyMap } from "./modifierKeyMap";
import { DEFAULT_MODIFIER_KEY_MAP } from "./modifierKeyMap";

/**
 * Translates physical key state to abstract modifier.
 * Macro takes priority if both keys are held.
 */
export function resolveModifier(
    state: InputState,
    keyMap: ModifierKeyMap = DEFAULT_MODIFIER_KEY_MAP,
): InputModifier {
    if (state[keyMap.macro]) return "macro";
    if (state[keyMap.micro]) return "micro";
    return "none";
}

function normalizeDevice(pointerType: string): PointerDevice {
    return pointerType === "touch" ? "touch" : "mouse";
}

/**
 * Pure function: raw event data in, semantic action out.
 * Accepts raw pointerType string — normalizes "pen" to "mouse" internally.
 * Returns null for unsupported button/device combinations.
 */
export function resolveAction(
    button: number,
    modifier: InputModifier,
    pointerType: string,
): InputAction | null {
    const device = normalizeDevice(pointerType);
    const resolvedModifier = device === "touch" ? "none" : modifier;

    if (button === 0) {
        return { type: "primary", modifier: resolvedModifier, device };
    }
    if (button === 1) {
        if (device === "touch") return null;
        return { type: "auxiliary", modifier: resolvedModifier, device };
    }
    if (button === 2) {
        return { type: "secondary", modifier: resolvedModifier, device };
    }
    return null;
}
