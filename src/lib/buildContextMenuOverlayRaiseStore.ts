import { derived, writable } from "svelte/store";

export const treeContextMenuOpen = writable(false);
export const nodeContextMenuOpen = writable(false);

export const buildContextMenuOpenForOverlayRaise = derived(
    [treeContextMenuOpen, nodeContextMenuOpen],
    ([$treeOpen, $nodeOpen]) => $treeOpen || $nodeOpen,
);

