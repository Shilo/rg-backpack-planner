import type { Component } from "svelte";
import {
    ArrowCounterClockwiseIcon,
    ArrowsOutCardinalIcon,
    ClockCounterClockwiseIcon,
    CoinIcon,
    CoinsIcon,
    CopySimpleIcon,
    DotsNineIcon,
    DotsThreeOutlineIcon,
    EyeIcon,
    GearSixIcon,
    GraphIcon,
    ListIcon,
    LockSimpleIcon,
    LockSimpleOpenIcon,
    RepeatIcon,
    SquaresFourIcon,
    TabsIcon,
    WarningCircleIcon,
} from "phosphor-svelte";
import { GuardianIcon, VanguardIcon } from "../customIcons";
import { getDeviceInputLabels } from "../input";
import {
    filterByDevice,
    getControlActions,
    type ControlAction,
    type InputBinding,
} from "../sideMenuPages/controlsData";
import type { Direction } from "./paneLayout";

export type OnboardingStepId =
    | "nodes"
    | "locked"
    | "root"
    | "tree"
    | "hud"
    | "primary-action"
    | "toolbar"
    | "preview"
    | "bottombar";
export type OnboardingTarget =
    | "node"
    | "locked-node"
    | "hud"
    | "primary-action"
    | "root"
    | "tree"
    | "toolbar"
    | "preview"
    | "bottombar";
type TargetRegion = "top-left" | "bottom-left" | "right";
type Translate = (key: string, params?: Record<string, unknown>) => string;

export type OnboardingCardData = {
    icon: Component;
    label: string | string[];
    description: string;
    title?: string;
    inputs?: InputBinding[];
    controlActionId?: string;
};

export type OnboardingStepDefinition = {
    id: OnboardingStepId;
    target: OnboardingTarget;
    direction: Direction;
    title: string;
    titleIcon: Component;
    variant: "accent" | "muted";
    cards: OnboardingCardData[];
    splitIndex?: number;
};

type CreateOnboardingStepsOptions = {
    translate: Translate;
    isTouch: boolean;
    compactLayout: boolean;
    targetRegion: TargetRegion;
    lockedNodeRegion: TargetRegion;
};

export function createOnboardingSteps({
    translate,
    isTouch,
    compactLayout,
    targetRegion,
    lockedNodeRegion,
}: CreateOnboardingStepsOptions): OnboardingStepDefinition[] {
    const device = isTouch ? "touch" : "mouse";
    const labels = getDeviceInputLabels(device, translate);
    const controls = getControlActions(translate);
    const controlsById = new Map(controls.map((action) => [action.id, action]));
    const showMouse = !isTouch;
    const showTouch = isTouch;
    const showKeyboard = !isTouch;

    function getAction(actionId: string): ControlAction | undefined {
        return controlsById.get(actionId);
    }

    function getActionInputs(actionId: string): string[] {
        const action = getAction(actionId);
        if (!action) return [];
        return filterByDevice(
            action.inputs,
            showMouse,
            showTouch,
            showKeyboard,
        ).map((input) => input.keys);
    }

    function getActionTitle(
        actionId: string,
        fallbackKey: string,
        params?: Record<string, unknown>,
    ): string {
        return getAction(actionId)?.title ?? translate(fallbackKey, params);
    }

    function getActionDescription(
        actionId: string,
        fallbackKey: string,
        params?: Record<string, unknown>,
    ): string {
        return (
            getAction(actionId)?.description ??
            translate(fallbackKey, params)
        );
    }

    function controlCard(
        controlActionId: string,
        fallbackTitleKey: string,
        fallbackDescriptionKey: string,
        fallbackInputKey?: string,
        fallbackInputDevice: "mouse" | "touch" | "keyboard" = device,
        params?: Record<string, unknown>,
    ): OnboardingCardData {
        const action = getAction(controlActionId);
        const title = getActionTitle(controlActionId, fallbackTitleKey, params);
        const inputKeys = getActionInputs(controlActionId);
        const inputs =
            action != null
                ? filterByDevice(
                    action.inputs,
                    showMouse,
                    showTouch,
                    showKeyboard,
                )
                : fallbackInputKey
                    ? [
                        {
                            keys: translate(fallbackInputKey, params),
                            device: fallbackInputDevice,
                        },
                    ]
                    : [];

        return {
            icon: action?.icon ?? GraphIcon,
            label:
                inputs.length > 0
                    ? [title, ...inputKeys]
                    : title,
            description: getActionDescription(
                controlActionId,
                fallbackDescriptionKey,
                params,
            ),
            title,
            inputs,
            controlActionId,
        };
    }

    function customCard(
        icon: Component,
        title: string,
        description: string,
        inputs: InputBinding[] = [],
    ): OnboardingCardData {
        return {
            icon,
            label: inputs.length > 0 ? [title, ...inputs.map((input) => input.keys)] : title,
            description,
            title,
            inputs,
        };
    }

    const nodeCards = isTouch
        ? [
            controlCard(
                "node-level-up",
                "controls.actions.levelUp",
                "controls.actions.levelUpDesc",
                "input.primary.touch",
                "touch",
            ),
            controlCard(
                "node-options",
                "controls.actions.nodeOptions",
                "controls.actions.nodeTreeOptionsDesc",
                "input.secondary.touch",
                "touch",
            ),
        ]
        : [
            controlCard(
                "node-level-up",
                "controls.actions.levelUp",
                "controls.actions.levelUpDesc",
                "input.primary.mouse",
                "mouse",
            ),
            controlCard(
                "node-level-down",
                "controls.actions.levelDown",
                "controls.actions.levelDownDesc",
                "input.auxiliary.mouse",
                "mouse",
            ),
            controlCard(
                "node-level-up-alt",
                "controls.actions.levelUpAlt",
                "controls.actions.levelUpAltDesc",
                "input.alternate",
                "mouse",
            ),
            controlCard(
                "node-level-down-alt",
                "controls.actions.levelDownAlt",
                "controls.actions.levelDownAltDesc",
                "input.alternate",
                "mouse",
            ),
            controlCard(
                "node-options",
                "controls.actions.nodeOptions",
                "controls.actions.nodeTreeOptionsDesc",
                "input.secondary.mouse",
                "mouse",
            ),
        ];

    const lockedCards = [
        customCard(
            LockSimpleOpenIcon,
            translate("onboarding.lockedAccessible"),
            translate("onboarding.lockedAccessibleDesc"),
            [{ keys: labels.primary, device }],
        ),
        customCard(
            getAction("node-level-up-alt")?.icon ?? GraphIcon,
            translate("onboarding.lockedQuickLevel"),
            translate("onboarding.lockedQuickLevelDesc"),
        ),
    ];

    const hudCards = [
        {
            ...controlCard(
                "hud-budget",
                "controls.actions.budget",
                "controls.actions.budgetDesc",
                `input.primary.${device}` as const,
                device,
            ),
            icon: CoinIcon,
            title: translate("onboarding.setBudget"),
            label: [translate("onboarding.setBudget"), ...getActionInputs("hud-budget")],
        },
        customCard(
            CoinsIcon,
            translate("onboarding.budgetIgnoreLabel"),
            translate("onboarding.budgetIgnoreDesc"),
        ),
    ];

    const primaryActionCards = [
        {
            ...controlCard(
                "hud-primary-action",
                "controls.actions.primaryAction",
                "controls.actions.primaryActionDesc",
                `input.primary.${device}` as const,
                device,
            ),
            icon: RepeatIcon,
            title: translate("onboarding.changePrimaryAction", { input: labels.primary.toLowerCase() }),
            label: [translate("onboarding.changePrimaryAction", { input: labels.primary.toLowerCase() }), ...getActionInputs("hud-primary-action")],
        },
    ];

    const toolbarCards = [
        controlCard(
            "hud-undo",
            "controls.actions.undo",
            "controls.actions.undoDesc",
            `input.primary.${device}` as const,
            device,
        ),
        controlCard(
            "hud-redo",
            "controls.actions.redo",
            "controls.actions.redoDesc",
            `input.primary.${device}` as const,
            device,
        ),
        controlCard(
            "hud-reset-tree",
            "controls.actions.resetTree",
            "controls.actions.resetTreeDesc",
            `input.primary.${device}` as const,
            device,
        ),
    ];

    const rootCards = [
        {
            ...controlCard(
                "hud-root-quick-settings",
                "controls.actions.rootQuickSettings",
                "controls.actions.rootQuickSettingsDesc",
                `input.primary.${device}` as const,
                device,
            ),
            icon: GearSixIcon,
            title: translate("onboarding.quickSettings"),
            label: [translate("onboarding.quickSettings"), ...getActionInputs("hud-root-quick-settings")],
        },
    ];

    const treeCards = [
        controlCard(
            "tree-pan",
            "controls.actions.pan",
            "controls.actions.panDesc",
            isTouch ? "input.gestures.oneFingerDrag" : "input.gestures.drag",
            device,
        ),
        controlCard(
            "tree-zoom",
            "controls.actions.zoom",
            "controls.actions.zoomDesc",
            isTouch ? "input.gestures.pinch" : "input.gestures.scroll",
            device,
        ),
        controlCard(
            "tree-options",
            "controls.actions.treeOptions",
            "controls.actions.nodeTreeOptionsDesc",
            `input.secondary.${device}` as const,
            device,
        ),
    ];

    const previewCards = [
        {
            ...controlCard(
                "hud-preview-indicator",
                "controls.actions.previewIndicator",
                "controls.actions.previewIndicatorDesc",
                `input.primary.${device}` as const,
                device,
            ),
            icon: ListIcon,
            title: translate("onboarding.previewOptions"),
            label: [translate("onboarding.previewOptions"), ...getActionInputs("hud-preview-indicator")],
        },
        customCard(
            WarningCircleIcon,
            translate("onboarding.previewTemporary"),
            translate("onboarding.previewTemporaryDesc"),
        ),
        customCard(
            CopySimpleIcon,
            translate("onboarding.previewClone"),
            translate("onboarding.previewCloneDesc"),
        ),
    ];

    const bottombarCards = isTouch
        ? [
            customCard(
                GuardianIcon as unknown as Component,
                translate("onboarding.selectTab"),
                translate("onboarding.bottombarSwitchTree"),
                [{ keys: labels.primary, device }],
            ),
            {
                ...controlCard(
                    "tree-options",
                    "controls.actions.treeOptions",
                    "controls.actions.nodeTreeOptionsDesc",
                    "input.secondary.touch",
                    "touch",
                ),
                icon: VanguardIcon as unknown as Component,
            },
            controlCard(
                "hud-side-menu",
                "controls.actions.sideMenu",
                "controls.actions.sideMenuDesc",
                "input.primary.touch",
                "touch",
            ),
            controlCard(
                "hud-fullscreen",
                "controls.actions.fullscreen",
                "controls.actions.fullscreenDesc",
                "input.primary.touch",
                "touch",
            ),
        ]
        : [
            customCard(
                GuardianIcon as unknown as Component,
                translate("onboarding.selectTab"),
                translate("onboarding.bottombarSwitchTree"),
                [{ keys: labels.primary, device }],
            ),
            {
                ...controlCard(
                    "hud-cycle-tabs",
                    "controls.actions.cycleTabs",
                    "controls.actions.cycleTabsDesc",
                    "input.keyboard.cycle",
                    "keyboard",
                ),
                icon: SquaresFourIcon,
            },
            {
                ...controlCard(
                    "tree-options",
                    "controls.actions.treeOptions",
                    "controls.actions.nodeTreeOptionsDesc",
                    "input.secondary.mouse",
                    "mouse",
                ),
                icon: VanguardIcon as unknown as Component,
            },
            controlCard(
                "hud-side-menu",
                "controls.actions.sideMenu",
                "controls.actions.sideMenuDesc",
                "input.primary.mouse",
                "mouse",
            ),
            controlCard(
                "hud-fullscreen",
                "controls.actions.fullscreen",
                "controls.actions.fullscreenDesc",
                "input.primary.mouse",
                "mouse",
            ),
        ];

    return [
        {
            id: "nodes",
            target: "node",
            direction: targetRegion === "right" ? "left" : "right",
            title: translate("onboarding.nodesSection"),
            titleIcon: GraphIcon,
            variant: "accent",
            cards: nodeCards,
            splitIndex: 2,
        },
        {
            id: "locked",
            target: "locked-node",
            direction: lockedNodeRegion === "right" ? "left" : "right",
            title: translate("onboarding.lockedSection"),
            titleIcon: LockSimpleIcon,
            variant: "accent",
            cards: lockedCards,
        },
        {
            id: "root",
            target: "root",
            direction: compactLayout ? "down" : "right",
            title: translate("onboarding.rootSection"),
            titleIcon:
                getAction("hud-root-quick-settings")?.icon ?? GraphIcon,
            variant: "accent",
            cards: rootCards,
        },
        {
            id: "tree",
            target: "tree",
            direction: compactLayout ? "up" : "left",
            title: translate("onboarding.treeSection"),
            titleIcon: DotsNineIcon,
            variant: "accent",
            cards: treeCards,
            splitIndex: 2,
        },
        {
            id: "hud",
            target: "hud",
            direction: "left",
            title: getActionTitle("hud-budget", "onboarding.hudSection"),
            titleIcon: getAction("hud-budget")?.icon ?? CoinsIcon,
            variant: "muted",
            cards: hudCards,
        },
        {
            id: "preview",
            target: "preview",
            direction: "down",
            title: getActionTitle(
                "hud-preview-indicator",
                "onboarding.previewSection",
            ),
            titleIcon: getAction("hud-preview-indicator")?.icon ?? EyeIcon,
            variant: "muted",
            cards: previewCards,
        },
        {
            id: "primary-action",
            target: "primary-action",
            direction: "up",
            title: getActionTitle(
                "hud-primary-action",
                "controls.actions.primaryAction",
            ),
            titleIcon:
                getAction("hud-primary-action")?.icon ??
                ArrowCounterClockwiseIcon,
            variant: "muted",
            cards: primaryActionCards,
        },
        {
            id: "toolbar",
            target: "toolbar",
            direction: "up",
            title: translate("onboarding.historyToolbar"),
            titleIcon: ClockCounterClockwiseIcon,
            variant: "muted",
            cards: toolbarCards,
        },
        {
            id: "bottombar",
            target: "bottombar",
            direction: "up",
            title: translate("onboarding.navigationBar"),
            titleIcon: TabsIcon,
            variant: "muted",
            cards: bottombarCards,
            splitIndex: 3,
        },
    ];
}
