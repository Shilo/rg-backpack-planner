import type { Component } from "svelte";
import {
    ArrowCounterClockwiseIcon,
    ArrowsOutCardinalIcon,
    CornersOutIcon,
    CursorClickIcon,
    DotsThreeOutlineIcon,
    EyeIcon,
    GraphIcon,
    HandGrabbingIcon,
    HandTapIcon,
    ListIcon,
    LockIcon,
    MouseLeftClickIcon,
    MouseMiddleClickIcon,
    MouseRightClickIcon,
    MouseScrollIcon,
} from "phosphor-svelte";
import { GuardianIcon, RootNodeIcon, TechCrystalIcon } from "../customIcons";
import LongPressIcon from "../icons/LongPressIcon.svelte";
import PinchIcon from "../icons/PinchIcon.svelte";
import type { Direction } from "./paneLayout";

export type OnboardingStepId =
    | "nodes"
    | "locked"
    | "root"
    | "tree"
    | "hud"
    | "preview"
    | "bottombar";
export type OnboardingTarget =
    | "node"
    | "locked-node"
    | "hud"
    | "root"
    | "tree"
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
    const nodeCards = isTouch
        ? [
            {
                icon: HandTapIcon,
                label: translate("onboarding.tap"),
                description: translate("onboarding.levelUp"),
            },
            {
                icon: LongPressIcon,
                label: translate("onboarding.longPress"),
                description: translate("onboarding.options"),
            },
        ]
        : [
            {
                icon: MouseLeftClickIcon,
                label: translate("onboarding.leftClick"),
                description: translate("onboarding.levelUp"),
            },
            {
                icon: MouseRightClickIcon,
                label: translate("onboarding.rightClick"),
                description: translate("onboarding.options"),
            },
            {
                icon: MouseMiddleClickIcon,
                label: [
                    translate("onboarding.middleClick"),
                    translate("onboarding.shiftLeftClick"),
                ],
                description: translate("onboarding.levelDown"),
            },
        ];

    const lockedCards = [
        {
            icon: primaryInputIcon,
            label: primaryInputLabel,
            description: translate("onboarding.lockedNodeLevel"),
        },
    ];

    const hudCards = [
        {
            icon: TechCrystalIcon as unknown as Component,
            label: primaryInputLabel,
            description: translate("onboarding.techCrystalBudget"),
        },
        {
            icon: ArrowCounterClockwiseIcon,
            label: primaryInputLabel,
            description: translate("onboarding.resetActiveTree"),
        },
    ];

    const rootCards = [
        {
            icon: primaryInputIcon,
            label: primaryInputLabel,
            description: translate("onboarding.rootQuickSettings"),
        },
        {
            icon: primaryInputIcon,
            label: primaryInputLabel,
            description: translate("onboarding.rootPrimaryAction"),
        },
    ];

    const treeCards = isTouch
        ? [
            {
                icon: LongPressIcon,
                label: translate("onboarding.longPress"),
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
                label: translate("onboarding.rightClick"),
                description: translate("onboarding.treeOptions"),
            },
            {
                icon: ArrowsOutCardinalIcon,
                label: translate("onboarding.clickDrag"),
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
            icon: HandTapIcon,
            label: primaryInputLabel,
            description: translate("onboarding.previewOptions"),
        },
    ];

    const bottombarCards = isTouch
        ? [
            {
                icon: ListIcon,
                label: translate("onboarding.tap"),
                description: translate("onboarding.bottombarToggleMenu"),
            },
            {
                icon: GuardianIcon as unknown as Component,
                label: translate("onboarding.bottombarTapTab"),
                description: translate("onboarding.bottombarSwitchTree"),
            },
            {
                icon: GuardianIcon as unknown as Component,
                label: translate("onboarding.longPress"),
                description: translate("onboarding.bottombarTreeOptions"),
            },
            {
                icon: CornersOutIcon,
                label: translate("onboarding.tap"),
                description: translate("onboarding.bottombarToggleFullscreen"),
            },
        ]
        : [
            {
                icon: ListIcon,
                label: translate("onboarding.leftClick"),
                description: translate("onboarding.bottombarToggleMenu"),
            },
            {
                icon: GuardianIcon as unknown as Component,
                label: translate("onboarding.bottombarClickTab"),
                description: translate("onboarding.bottombarSwitchTree"),
            },
            {
                icon: GuardianIcon as unknown as Component,
                label: translate("onboarding.rightClick"),
                description: translate("onboarding.bottombarTreeOptions"),
            },
            {
                icon: CornersOutIcon,
                label: translate("onboarding.leftClick"),
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
            titleIcon: LockIcon,
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
            variant: "muted",
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
