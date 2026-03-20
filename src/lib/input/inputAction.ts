export type InputActionType = "primary" | "secondary" | "auxiliary";
export type PointerDevice = "mouse" | "touch";

export type InputModifiers = {
    reverse: boolean;
    alternate: boolean;
};

export type InputAction = {
    type: InputActionType;
    modifiers: InputModifiers;
    device: PointerDevice;
};
