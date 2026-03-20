import type { Component } from "svelte";
import {
    ArrowArcLeftIcon,
    ArrowArcRightIcon,
    ArrowCounterClockwiseIcon,
    ArrowFatLineUpIcon,
    ArrowsOutCardinalIcon,
    ClockCounterClockwiseIcon,
    CoinsIcon,
    CopySimpleIcon,
    CornersOutIcon,
    DotsThreeOutlineIcon,
    EyeIcon,
    GearSixIcon,
    GraphIcon,
    HandGrabbingIcon,
    HandTapIcon,
    ListIcon,
    LockSimpleIcon,
    LockSimpleOpenIcon,
    MouseLeftClickIcon,
    MouseMiddleClickIcon,
    MouseRightClickIcon,
    MouseScrollIcon,
    WarningCircleIcon,
} from "phosphor-svelte";
import { GuardianIcon, RootNodeIcon, TechCrystalIcon, VanguardIcon } from "../customIcons";
import LongPressIcon from "../icons/LongPressIcon.svelte";
import PinchIcon from "../icons/PinchIcon.svelte";
import { getDeviceInputLabels } from "../input";
import type { Direction } from "./paneLayout";

export type OnboardingStepId =
    | "nodes"
    | "locked"
    | "root"
    | "tree"
    | "hud"
    | "toolbar"
    | "preview"
    | "bottombar";
export type OnboardingTarget =
    | "node"
    | "locked-node"
    | "hud"
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
};

export type OnboardingStepDefinition = {
    id: OnboardingStepId;
    target: OnboardingTarget;
    direction: Direction;
    title: string;
    titleIcon: Component;
    variant: "accent" | "muted";
    cards: OnboardingCardData[];
};

type CreateOnboardingStepsOptions = {
    translate: Translate;
    isTouch: boolean;
    primaryInputIcon: Component;
    primaryInputLabel: string;
    compactLayout: boolean;
    targetRegion: TargetRegion;
    lockedNodeRegion: TargetRegion;
};

export function createOnboardingSteps({
    translate,
    isTouch,
    primaryInputIcon,
    primaryInputLabel,
    compactLayout,
    targetRegion,
    lockedNodeRegion,
}: CreateOnboardingStepsOptions): OnboardingStepDefinition[] {
    const device = isTouch ? "touch" : "mouse";
    const labels = getDeviceInputLabels(device, translate);

    const nodeCards = isTouch
        ? [
            {
                icon: HandTapIcon,
                label: translate("input.primary.touch"),
                description: translate("onboarding.levelUp"),
            },
            {
                icon: LongPressIcon,
                label: translate("input.secondary.touch"),
                description: translate("onboarding.options"),
            },
        ]
        : [
            {
                icon: MouseLeftClickIcon,
                label: translate("input.primary.mouse"),
                description: translate("onboarding.levelUp"),
            },
            {
                icon: MouseMiddleClickIcon,
                label: translate("input.auxiliary.mouse"),
                description: translate("onboarding.levelDown"),
            },
            {
                icon: MouseRightClickIcon,
                label: translate("input.secondary.mouse"),
                description: translate("onboarding.options"),
            },
        ];

    const lockedCards = [
        {
            icon: LockSimpleOpenIcon,
            label: translate("onboarding.lockedAccessible"),
            description: translate("onboarding.lockedAccessibleDesc"),
        },
        {
            icon: ArrowFatLineUpIcon,
            label: translate("onboarding.lockedQuickLevel"),
            description: translate("onboarding.lockedQuickLevelDesc"),
        },
    ];

    const hudCards = [
        {
            icon: isTouch ? HandTapIcon : MouseLeftClickIcon,
            label: translate("onboarding.actionTechCrystal", { action: labels.primary }),
            description: translate("onboarding.techCrystalBudget"),
        },
        {
            icon: CoinsIcon,
            label: translate("onboarding.budgetIgnoreLabel"),
            description: translate("onboarding.budgetIgnoreDesc"),
        },
    ];

    const toolbarCards = [
        {
            icon: ArrowArcLeftIcon,
            label: translate("onboarding.actionUndoButton", { action: labels.primary }),
            description: translate("onboarding.undoDesc"),
        },
        {
            icon: ArrowArcRightIcon,
            label: translate("onboarding.actionRedoButton", { action: labels.primary }),
            description: translate("onboarding.redoDesc"),
        },
        {
            icon: ArrowCounterClockwiseIcon,
            label: translate("onboarding.actionResetButton", { action: labels.primary }),
            description: translate("onboarding.resetActiveTreeOptions"),
        },
    ];

    const rootCards = [
        {
            icon: primaryInputIcon,
            label: translate("onboarding.actionNode", { action: labels.primary }),
            description: translate("onboarding.rootQuickSettings"),
        },
        {
            icon: GearSixIcon,
            label: translate("onboarding.actionOption", { action: labels.primary }),
            description: translate("onboarding.rootPrimaryAction"),
        },
    ];

    const treeCards = isTouch
        ? [
            {
                icon: LongPressIcon,
                label: translate("input.secondary.touch"),
                description: translate("onboarding.treeOptions"),
            },
            {
                icon: HandGrabbingIcon,
                label: translate("onboarding.swipe"),
                description: translate("onboarding.pan"),
            },
            {
                icon: PinchIcon,
                label: translate("onboarding.pinch"),
                description: translate("onboarding.zoom"),
            },
        ]
        : [
            {
                icon: MouseRightClickIcon,
                label: translate("input.secondary.mouse"),
                description: translate("onboarding.treeOptions"),
            },
            {
                icon: ArrowsOutCardinalIcon,
                label: translate("onboarding.clickDrag", { action: translate("input.primary.mouse") }),
                description: translate("onboarding.pan"),
            },
            {
                icon: MouseScrollIcon,
                label: translate("onboarding.scroll"),
                description: translate("onboarding.zoom"),
            },
        ];

    const previewCards = [
        {
            icon: isTouch ? HandTapIcon : MouseLeftClickIcon,
            label: primaryInputLabel,
            description: translate("onboarding.previewViewOptionsDesc"),
        },
        {
            icon: WarningCircleIcon,
            label: translate("onboarding.previewTemporary"),
            description: translate("onboarding.previewTemporaryDesc"),
        },
        {
            icon: CopySimpleIcon,
            label: translate("onboarding.previewClone"),
            description: translate("onboarding.previewCloneDesc"),
        },
    ];

    const bottombarCards = isTouch
        ? [
            {
                icon: GuardianIcon as unknown as Component,
                label: translate("onboarding.bottombarActionTab", { action: labels.primary }),
                description: translate("onboarding.bottombarSwitchTree"),
            },
            {
                icon: VanguardIcon as unknown as Component,
                label: translate("onboarding.bottombarSecondaryActionTab", { action: labels.secondary }),
                description: translate("onboarding.bottombarTreeOptions"),
            },
            {
                icon: ListIcon,
                label: translate("onboarding.bottombarActionDrawerButton", { action: labels.primary }),
                description: translate("onboarding.bottombarToggleMenu"),
            },
            {
                icon: CornersOutIcon,
                label: translate("onboarding.bottombarActionFullscreen", { action: labels.primary }),
                description: translate("onboarding.bottombarToggleFullscreen"),
            },
        ]
        : [
            {
                icon: ListIcon,
                label: translate("onboarding.bottombarActionDrawerButton", { action: labels.primary }),
                description: translate("onboarding.bottombarToggleMenu"),
            },
            {
                icon: GuardianIcon as unknown as Component,
                label: translate("onboarding.bottombarActionTab", { action: labels.primary }),
                description: translate("onboarding.bottombarSwitchTree"),
            },
            {
                icon: VanguardIcon as unknown as Component,
                label: translate("onboarding.bottombarSecondaryActionTab", { action: labels.secondary }),
                description: translate("onboarding.bottombarTreeOptions"),
            },
            {
                icon: CornersOutIcon,
                label: translate("onboarding.bottombarActionFullscreen", { action: labels.primary }),
                description: translate("onboarding.bottombarToggleFullscreen"),
            },
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
            titleIcon: RootNodeIcon,
            variant: "accent",
            cards: rootCards,
        },
        {
            id: "tree",
            target: "tree",
            direction: compactLayout ? "up" : "left",
            title: translate("onboarding.treeSection"),
            titleIcon: ArrowsOutCardinalIcon,
            variant: "accent",
            cards: treeCards,
        },
        {
            id: "hud",
            target: "hud",
            direction: "left",
            title: translate("onboarding.hudSection"),
            titleIcon: TechCrystalIcon as unknown as Component,
            variant: "muted",
            cards: hudCards,
        },
        {
            id: "preview",
            target: "preview",
            direction: "down",
            title: translate("onboarding.previewSection"),
            titleIcon: EyeIcon,
            variant: "muted",
            cards: previewCards,
        },
        {
            id: "toolbar",
            target: "toolbar",
            direction: "up",
            title: translate("onboarding.toolbarSection"),
            titleIcon: ClockCounterClockwiseIcon,
            variant: "muted",
            cards: toolbarCards,
        },
        {
            id: "bottombar",
            target: "bottombar",
            direction: "up",
            title: translate("onboarding.bottombarSection"),
            titleIcon: DotsThreeOutlineIcon,
            variant: "muted",
            cards: bottombarCards,
        },
    ];
}
