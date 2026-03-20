import type { InputActionType, InputModifier, PointerDevice } from "./inputAction";
import type { KeyboardActionType } from "./keyboardAction";
import type { TooltipContent } from "../tooltip";
import { hasKeyboard } from "./inputStore";

type TranslateFn = (key: string) => string;

export function getModifierLabel(modifier: InputModifier, t: TranslateFn): string {
    if (modifier === "none") return "";
    return t(`input.${modifier}`);
}

export function getButtonLabel(
    type: InputActionType,
    device: PointerDevice,
    t: TranslateFn,
): string {
    return t(`input.${type}.${device}`);
}

export function getInputLabel(
    type: InputActionType,
    modifier: InputModifier,
    device: PointerDevice,
    t: TranslateFn,
): string {
    const button = getButtonLabel(type, device, t);
    if (modifier === "none") return button;
    const mod = getModifierLabel(modifier, t);
    const sep = t("input.modifierSeparator");
    return mod + sep + button;
}

export type DeviceInputLabels = {
    primary: string;
    secondary: string;
    auxiliary?: string;
    macroPrimary: string;
    microPrimary: string;
    macroAuxiliary?: string;
    microAuxiliary?: string;
};

export function getDeviceInputLabels(device: PointerDevice, t: TranslateFn): DeviceInputLabels {
    const labels: DeviceInputLabels = {
        primary: getInputLabel("primary", "none", device, t),
        secondary: getInputLabel("secondary", "none", device, t),
        macroPrimary: getInputLabel("primary", "macro", device, t),
        microPrimary: getInputLabel("primary", "micro", device, t),
    };
    if (device === "mouse") {
        labels.auxiliary = getInputLabel("auxiliary", "none", device, t);
        labels.macroAuxiliary = getInputLabel("auxiliary", "macro", device, t);
        labels.microAuxiliary = getInputLabel("auxiliary", "micro", device, t);
    }
    return labels;
}

// Keyboard labels only — pointer modifiers (Ctrl+Click) intentionally use
// ctrlKey on all platforms, since browsers reserve Cmd+Click on Mac.
const IS_MAC =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const MAC_KEYBOARD_LABELS: Partial<Record<KeyboardActionType, string>> = {
    undo: "⌘ + Z",
    redo: "⌘ + Shift + Z",
};

export function getKeyboardActionLabel(action: KeyboardActionType, t: TranslateFn): string {
    if (IS_MAC && MAC_KEYBOARD_LABELS[action]) {
        return MAC_KEYBOARD_LABELS[action]!;
    }
    if (action === "cycle") {
        const sep = t("input.keyboardSeparator");
        return t("input.keyboard.cycle") + sep + t("input.keyboard.arrowLeft") + sep + t("input.keyboard.arrowRight");
    }
    return t(`input.keyboard.${action}`);
}

/**
 * Builds tooltip content with a shortcut hint on a separate line.
 * Returns undefined when no content would be produced.
 * Skips the shortcut on devices without a keyboard.
 */
export function buildShortcutTooltip(text: TooltipContent | undefined, shortcut: string | undefined): TooltipContent | undefined {
    const showShortcut = !!shortcut && hasKeyboard();
    if (!text && !showShortcut) return undefined;
    if (!text && showShortcut) return [{ type: "shortcut", value: shortcut! }];
    if (!showShortcut) return text;
    if (typeof text === "string") {
        return [{ type: "text", value: text }, { type: "shortcut", value: shortcut! }];
    }
    return [...text!, { type: "shortcut", value: shortcut! }];
}
