export type ModifierKeyMap = {
    reverse: "shiftKey" | "ctrlKey";
    alternate: "shiftKey" | "ctrlKey";
};

export const DEFAULT_MODIFIER_KEY_MAP: ModifierKeyMap = {
    reverse: "shiftKey",
    alternate: "ctrlKey",
};
