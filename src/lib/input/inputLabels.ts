import type { InputActionType, PointerDevice } from "./inputAction";
import type { KeyboardActionType } from "./keyboardAction";
import type { TooltipContent } from "../tooltip";
import { hasKeyboard } from "./inputStore";

type TranslateFn = (key: string) => string;

export type ModifierName = "reverse" | "alternate";

export function getModifierLabel(modifier: ModifierName, t: TranslateFn): string {
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
    modifier: ModifierName | null,
    device: PointerDevice,
    t: TranslateFn,
): string {
    const button = getButtonLabel(type, device, t);
    if (!modifier) return button;
    const mod = getModifierLabel(modifier, t);
    const sep = t("input.modifierSeparator");
    return mod + sep + button;
}

export type DeviceInputLabels = {
    primary: string;
    secondary: string;
    auxiliary?: string;
    reversePrimary: string;
    alternatePrimary: string;
    alternateAuxiliary?: string;
    reverseAlternatePrimary?: string;
};

export function getDeviceInputLabels(device: PointerDevice, t: TranslateFn): DeviceInputLabels {
    const labels: DeviceInputLabels = {
        primary: getInputLabel("primary", null, device, t),
        secondary: getInputLabel("secondary", null, device, t),
        reversePrimary: getInputLabel("primary", "reverse", device, t),
        alternatePrimary: getInputLabel("primary", "alternate", device, t),
    };
    if (device === "mouse") {
        labels.auxiliary = getInputLabel("auxiliary", null, device, t);
        labels.alternateAuxiliary = getInputLabel("auxiliary", "alternate", device, t);
        const sep = t("input.modifierSeparator");
        labels.reverseAlternatePrimary = getModifierLabel("alternate", t) + sep + getInputLabel("primary", "reverse", device, t);
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
        const tab = t("input.keyboard.cycle");
        const shiftTab = t("input.reverse") + t("input.modifierSeparator") + tab;
        return tab + sep + shiftTab + sep + t("input.keyboard.arrowLeft") + sep + t("input.keyboard.arrowRight");
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
