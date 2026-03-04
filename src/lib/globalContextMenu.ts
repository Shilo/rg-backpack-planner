export const NATIVE_CONTEXT_MENU_SELECTOR =
    'input, textarea, [contenteditable]:not([contenteditable="false"]), [data-allow-native-contextmenu]';

type ClosestCapableTarget = EventTarget & {
    closest?: (selector: string) => Element | null | unknown;
    parentElement?: ClosestCapableTarget | null;
};

const getClosestCapableTarget = (
    target: EventTarget | null,
): ClosestCapableTarget | null => {
    if (!target || typeof target !== "object") {
        return null;
    }

    const contextTarget = target as ClosestCapableTarget;
    if (typeof contextTarget.closest === "function") {
        return contextTarget;
    }

    return contextTarget.parentElement ?? null;
};

export const shouldPreventGlobalContextMenu = (
    target: EventTarget | null,
    isDev: boolean,
): boolean => {
    if (isDev) {
        return false;
    }

    const contextTarget = getClosestCapableTarget(target);
    if (contextTarget?.closest?.(NATIVE_CONTEXT_MENU_SELECTOR)) {
        return false;
    }

    return true;
};
