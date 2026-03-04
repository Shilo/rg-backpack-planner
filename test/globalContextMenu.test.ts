import {
    NATIVE_CONTEXT_MENU_SELECTOR,
    shouldPreventGlobalContextMenu,
} from "../src/lib/globalContextMenu.ts";

type ClosestCapableTarget = {
    closest: (selector: string) => unknown;
};

const createTarget = (matchesNativeContextMenuSelector: boolean): ClosestCapableTarget => ({
    closest: (selector: string) =>
        matchesNativeContextMenuSelector &&
        selector === NATIVE_CONTEXT_MENU_SELECTOR
            ? { selector }
            : null,
});

const createChildTarget = (matchesParentSelector: boolean) => ({
    parentElement: createTarget(matchesParentSelector),
});

if (shouldPreventGlobalContextMenu(null, false) !== true) {
    throw new Error("Expected null target to be blocked outside dev mode.");
}

if (shouldPreventGlobalContextMenu(createTarget(false), true) !== false) {
    throw new Error("Expected dev mode to allow the native context menu.");
}

if (shouldPreventGlobalContextMenu(createTarget(true), false) !== false) {
    throw new Error(
        "Expected editable targets to allow the native context menu outside dev mode.",
    );
}

if (shouldPreventGlobalContextMenu(createChildTarget(true), false) !== false) {
    throw new Error(
        "Expected descendants inside editable targets to allow the native context menu outside dev mode.",
    );
}

if (shouldPreventGlobalContextMenu(createTarget(false), false) !== true) {
    throw new Error(
        "Expected non-editable targets to be blocked outside dev mode.",
    );
}
