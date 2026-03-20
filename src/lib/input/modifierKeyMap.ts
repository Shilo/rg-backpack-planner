export type ModifierKeyMap = {
    macro: "shiftKey" | "ctrlKey";
    micro: "shiftKey" | "ctrlKey";
};

export const DEFAULT_MODIFIER_KEY_MAP: ModifierKeyMap = {
    macro: "shiftKey",
    micro: "ctrlKey",
};
