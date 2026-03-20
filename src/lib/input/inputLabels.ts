import type { InputActionType, InputModifier, PointerDevice } from "./inputAction";

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
