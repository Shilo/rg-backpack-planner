import type { InputAction, InputModifiers, PointerDevice } from "./inputAction";
import type { InputState } from "./inputStore";
import type { ModifierKeyMap } from "./modifierKeyMap";
import { DEFAULT_MODIFIER_KEY_MAP } from "./modifierKeyMap";

const NO_MODIFIERS: InputModifiers = { reverse: false, alternate: false };

/**
 * Translates physical key state to composable modifier object.
 * Both reverse and alternate are independently active.
 */
export function resolveModifiers(
    state: InputState,
    keyMap: ModifierKeyMap = DEFAULT_MODIFIER_KEY_MAP,
): InputModifiers {
    return {
        reverse: state[keyMap.reverse],
        alternate: state[keyMap.alternate],
    };
}

function normalizeDevice(pointerType: string): PointerDevice {
    return pointerType === "touch" ? "touch" : "mouse";
}

/**
 * Pure function: raw event data in, semantic action out.
 * Touch devices force modifiers to { reverse: false, alternate: false }.
 * Returns null for unsupported button/device combinations.
 */
export function resolveAction(
    button: number,
    modifiers: InputModifiers,
    pointerType: string,
): InputAction | null {
    const device = normalizeDevice(pointerType);
    const resolved = device === "touch" ? NO_MODIFIERS : modifiers;

    if (button === 0) {
        return { type: "primary", modifiers: resolved, device };
    }
    if (button === 1) {
        if (device === "touch") return null;
        return { type: "auxiliary", modifiers: resolved, device };
    }
    if (button === 2) {
        return { type: "secondary", modifiers: resolved, device };
    }
    return null;
}
