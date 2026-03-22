import type { Component } from "svelte";
import {
    CaretUpIcon,
    ListIcon,
    TrashSimpleIcon,
    ArrowArcLeftIcon,
    ArrowArcRightIcon,
    ImageIcon,
    CornersOutIcon,
    SquaresFourIcon,
    EyeIcon,
    ArrowsOutCardinalIcon,
    MagnifyingGlassPlusIcon,
    ArrowLineLeftIcon,
    PlusCircleIcon,
    MinusCircleIcon,
    DotsThreeOutlineIcon,
} from "phosphor-svelte";
import { TechCrystalIcon, RootNodeIcon } from "../customIcons";
import { getDeviceInputLabels, getKeyboardActionLabel } from "../input";

export type InputDevice = "mouse" | "touch" | "keyboard";

export type InputBinding = {
    keys: string;
    device: InputDevice;
    /** When true, combo chips render inline (row) instead of stacked (column). */
    inline?: boolean;
};

export type ControlAction = {
    id: string;
    title: string;
    description: string;
    icon: Component;
    inputs: InputBinding[];
    section: "hud" | "node" | "tree";
};

export const SECTIONS = ["node", "tree", "hud"] as const;
export type ControlSection = (typeof SECTIONS)[number];

type TranslateFn = (key: string) => string;

export function getControlActions(t: TranslateFn): ControlAction[] {
    const mouse = getDeviceInputLabels("mouse", t);
    const touch = getDeviceInputLabels("touch", t);
    function kbd(action: Parameters<typeof getKeyboardActionLabel>[0]): string {
        return getKeyboardActionLabel(action, t);
    }
    const gesture = (key: string) => t(`input.gestures.${key}`);

    return [
        // ── HUD ──
        {
            id: "hud-primary-action",
            title: t("controls.actions.primaryAction"),
            description: t("controls.actions.primaryActionDesc"),
            icon: CaretUpIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("cyclePrimaryAction"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-budget",
            title: t("controls.actions.budget"),
            description: t("controls.actions.budgetDesc"),
            icon: TechCrystalIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("budget"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-side-menu",
            title: t("controls.actions.sideMenu"),
            description: t("controls.actions.sideMenuDesc"),
            icon: ListIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("dismiss"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-reset-tree",
            title: t("controls.actions.resetTree"),
            description: t("controls.actions.resetTreeDesc"),
            icon: TrashSimpleIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("back"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-undo",
            title: t("controls.actions.undo"),
            description: t("controls.actions.undoDesc"),
            icon: ArrowArcLeftIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("undo"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-redo",
            title: t("controls.actions.redo"),
            description: t("controls.actions.redoDesc"),
            icon: ArrowArcRightIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("redo"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-root-quick-settings",
            title: t("controls.actions.rootQuickSettings"),
            description: t("controls.actions.rootQuickSettingsDesc"),
            icon: RootNodeIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("console"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-screenshot",
            title: t("controls.actions.screenshot"),
            description: t("controls.actions.screenshotDesc"),
            icon: ImageIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("screenshot"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-fullscreen",
            title: t("controls.actions.fullscreen"),
            description: t("controls.actions.fullscreenDesc"),
            icon: CornersOutIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("fullscreen"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-cycle-tabs",
            title: t("controls.actions.cycleTabs"),
            description: t("controls.actions.cycleTabsDesc"),
            icon: SquaresFourIcon,
            inputs: [
                { keys: t("input.keyboard.cycle") + t("input.keyboardSeparator") + t("input.reverse") + t("input.modifierSeparator") + t("input.keyboard.cycle"), device: "keyboard" },
                { keys: t("input.keyboard.arrowLeft") + t("input.keyboardSeparator") + t("input.keyboard.arrowRight"), device: "keyboard", inline: true },
            ],
            section: "hud",
        },
        {
            id: "hud-preview-indicator",
            title: t("controls.actions.previewIndicator"),
            description: t("controls.actions.previewIndicatorDesc"),
            icon: EyeIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-close-menu",
            title: t("controls.actions.closeMenu"),
            description: t("controls.actions.closeMenuDesc"),
            icon: ArrowLineLeftIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: gesture("swipeRight"), device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "tree-tooltip",
            title: t("controls.actions.tooltip"),
            description: t("controls.actions.tooltipDesc"),
            icon: EyeIcon,
            inputs: [
                { keys: gesture("hover"), device: "mouse" },
                { keys: touch.secondary, device: "touch" },
            ],
            section: "hud",
        },
        // ── Node ──
        {
            id: "node-level-up",
            title: t("controls.actions.levelUp"),
            description: t("controls.actions.levelUpDesc"),
            icon: PlusCircleIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "node",
        },
        {
            id: "node-level-up-alt",
            title: t("controls.actions.levelUpAlt"),
            description: t("controls.actions.levelUpAltDesc"),
            icon: PlusCircleIcon,
            inputs: [{ keys: mouse.alternatePrimary, device: "mouse" }],
            section: "node",
        },
        {
            id: "node-level-down",
            title: t("controls.actions.levelDown"),
            description: t("controls.actions.levelDownDesc"),
            icon: MinusCircleIcon,
            inputs: [
                { keys: mouse.auxiliary!, device: "mouse" },
                { keys: mouse.reversePrimary, device: "mouse" },
            ],
            section: "node",
        },
        {
            id: "node-level-down-alt",
            title: t("controls.actions.levelDownAlt"),
            description: t("controls.actions.levelDownAltDesc"),
            icon: MinusCircleIcon,
            inputs: [
                { keys: mouse.alternateAuxiliary!, device: "mouse" },
                { keys: mouse.reverseAlternatePrimary!, device: "mouse" },
            ],
            section: "node",
        },
        {
            id: "node-options",
            title: t("controls.actions.nodeOptions"),
            description: t("controls.actions.nodeOptionsDesc"),
            icon: DotsThreeOutlineIcon,
            inputs: [
                { keys: mouse.secondary, device: "mouse" },
                { keys: touch.secondary, device: "touch" },
            ],
            section: "node",
        },
        // ── Tree ──
        {
            id: "tree-pan",
            title: t("controls.actions.pan"),
            description: t("controls.actions.panDesc"),
            icon: ArrowsOutCardinalIcon,
            inputs: [
                { keys: gesture("drag"), device: "mouse" },
                { keys: gesture("oneFingerDrag"), device: "touch" },
            ],
            section: "tree",
        },
        {
            id: "tree-zoom",
            title: t("controls.actions.zoom"),
            description: t("controls.actions.zoomDesc"),
            icon: MagnifyingGlassPlusIcon,
            inputs: [
                { keys: gesture("scroll"), device: "mouse" },
                { keys: gesture("pinch"), device: "touch" },
            ],
            section: "tree",
        },
        {
            id: "tree-options",
            title: t("controls.actions.treeOptions"),
            description: t("controls.actions.treeOptionsDesc"),
            icon: DotsThreeOutlineIcon,
            inputs: [
                { keys: mouse.secondary, device: "mouse" },
                { keys: touch.secondary, device: "touch" },
            ],
            section: "tree",
        },
    ];
}

export function filterByDevice(
    inputs: InputBinding[],
    showMouse: boolean,
    showTouch: boolean,
    showKeyboard: boolean,
): InputBinding[] {
    return inputs.filter((b) => {
        if (b.device === "mouse") return showMouse;
        if (b.device === "touch") return showTouch;
        if (b.device === "keyboard") return showKeyboard;
        return false;
    });
}
