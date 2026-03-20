export type InputActionType = "primary" | "secondary" | "auxiliary";
export type InputModifier = "none" | "macro" | "micro";
export type PointerDevice = "mouse" | "touch";

export type InputAction = {
    type: InputActionType;
    modifier: InputModifier;
    device: PointerDevice;
};
