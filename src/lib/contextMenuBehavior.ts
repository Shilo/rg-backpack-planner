export function getContextMenuAnchorHeight({
    menuHeight,
    viewportHeight,
    hudTop,
    hudBottom,
    stableTop,
    pinnedHeight,
}: {
    menuHeight: number;
    viewportHeight: number;
    hudTop: number;
    hudBottom: number;
    stableTop: boolean;
    pinnedHeight: number;
}): number {
    const availableHeight = Math.max(0, viewportHeight - hudTop - hudBottom);
    const preferredHeight =
        stableTop && pinnedHeight > 0
            ? Math.max(pinnedHeight, menuHeight)
            : menuHeight;
    return Math.min(preferredHeight, availableHeight);
}

export function shouldStartContextMenuDrag({
    pointerType,
    button,
    isInteractiveTarget,
    isDragHandleTarget,
}: {
    pointerType: string;
    button: number;
    isInteractiveTarget: boolean;
    isDragHandleTarget: boolean;
}): boolean {
    if (button !== 0 || isInteractiveTarget) return false;
    return pointerType === "touch" ? isDragHandleTarget : true;
}
