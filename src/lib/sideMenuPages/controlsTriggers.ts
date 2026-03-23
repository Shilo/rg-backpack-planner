import { tick } from "svelte";
import {
    KEYBOARD_ACTION_BINDINGS,
    type KeyboardActionType,
} from "../input/keyboardAction";

const KEYBOARD_TRIGGERS: Partial<Record<string, KeyboardActionType>> = {
    "hud-budget": "budget",
    "hud-reset-tree": "back",
    "hud-root-quick-settings": "console",
    "hud-screenshot": "screenshot",
    "hud-fullscreen": "fullscreen",
};

const DOM_TRIGGERS: Record<string, () => void> = {
    "hud-preview-indicator": () => {
        document
            .querySelector<HTMLElement>(".preview-indicator-button")
            ?.click();
    },
    "node-options": () => {
        const node =
            document.querySelector<HTMLElement>('[data-node-id="0"]') ??
            document.querySelector<HTMLElement>(
                '[data-node-id]:not([data-node-id="root"])',
            );
        if (!node) return;
        const rect = node.getBoundingClientRect();
        // Stop propagation past tree viewport so TreeTabs' secondary
        // handler doesn't also open the tree context menu.
        const viewport = node.closest(".tree-viewport");
        if (viewport) {
            viewport.addEventListener(
                "contextmenu",
                (e) => e.stopPropagation(),
                { once: true },
            );
        }
        node.dispatchEvent(
            new MouseEvent("contextmenu", {
                bubbles: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
            }),
        );
    },
    "tree-options": () => {
        document
            .querySelector<HTMLElement>(".tab-btn.active")
            ?.dispatchEvent(new Event("contextmenu", { bubbles: true }));
    },
};

function blurActiveElement(): void {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
}

function dispatchKeyboardAction(action: KeyboardActionType): void {
    const binding = KEYBOARD_ACTION_BINDINGS.find(
        (b) => b.action === action,
    );
    if (!binding) return;
    document.dispatchEvent(
        new KeyboardEvent("keydown", {
            key: binding.key,
            ctrlKey: binding.ctrl ?? false,
            shiftKey: binding.shift ?? false,
            altKey: binding.alt ?? false,
            bubbles: true,
            cancelable: true,
        }),
    );
}

export function getActionTrigger(
    actionId: string,
    closeMenu: () => void,
): (() => void) | undefined {
    const kbAction = KEYBOARD_TRIGGERS[actionId];
    if (kbAction) {
        return async () => {
            closeMenu();
            await tick();
            blurActiveElement();
            dispatchKeyboardAction(kbAction);
        };
    }

    const domTrigger = DOM_TRIGGERS[actionId];
    if (domTrigger) {
        return async () => {
            closeMenu();
            await tick();
            blurActiveElement();
            domTrigger();
        };
    }

    return undefined;
}
