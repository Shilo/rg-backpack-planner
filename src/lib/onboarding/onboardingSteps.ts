import type { Component } from "svelte";
import {
    ArrowCounterClockwiseIcon,
    ArrowFatLineUpIcon,
    ArrowsOutCardinalIcon,
    CopySimpleIcon,
    CornersOutIcon,
    DotsThreeOutlineIcon,
    DotsThreeOutlineVerticalIcon,
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
                icon: MouseMiddleClickIcon,
                label: [
                    translate("onboarding.middleClick"),
                    translate("onboarding.shiftLeftClick"),
                ],
                description: translate("onboarding.levelDown"),
            },
            {
                icon: MouseRightClickIcon,
                label: translate("onboarding.rightClick"),
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
            icon: TechCrystalIcon as unknown as Component,
            label: isTouch
                ? translate("onboarding.tapTechCrystal")
                : translate("onboarding.clickTechCrystal"),
            description: translate("onboarding.techCrystalBudget"),
        },
        {
            icon: ArrowCounterClockwiseIcon,
            label: isTouch
                ? translate("onboarding.tapResetButton")
                : translate("onboarding.clickResetButton"),
            description: translate("onboarding.resetActiveTreeOptions"),
        },
    ];

    const rootCards = [
        {
            icon: primaryInputIcon,
            label: isTouch
                ? translate("onboarding.tapNode")
                : translate("onboarding.clickNode"),
            description: translate("onboarding.rootQuickSettings"),
        },
        {
            icon: GearSixIcon,
            label: isTouch
                ? translate("onboarding.tapOption")
                : translate("onboarding.clickOption"),
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
                label: translate("onboarding.bottombarTapTab"),
                description: translate("onboarding.bottombarSwitchTree"),
            },
            {
                icon: VanguardIcon as unknown as Component,
                label: translate("onboarding.bottombarLongPressTab"),
                description: translate("onboarding.bottombarTreeOptions"),
            },
            {
                icon: ListIcon,
                label: translate("onboarding.bottombarTapDrawerButton"),
                description: translate("onboarding.bottombarToggleMenu"),
            },
            {
                icon: CornersOutIcon,
                label: translate("onboarding.bottombarTapFullscreen"),
                description: translate("onboarding.bottombarToggleFullscreen"),
            },
        ]
        : [
            {
                icon: ListIcon,
                label: translate("onboarding.bottombarClickDrawerButton"),
                description: translate("onboarding.bottombarToggleMenu"),
            },
            {
                icon: GuardianIcon as unknown as Component,
                label: translate("onboarding.bottombarClickTab"),
                description: translate("onboarding.bottombarSwitchTree"),
            },
            {
                icon: VanguardIcon as unknown as Component,
                label: translate("onboarding.bottombarRightClickTab"),
                description: translate("onboarding.bottombarTreeOptions"),
            },
            {
                icon: CornersOutIcon,
                label: translate("onboarding.bottombarClickFullscreen"),
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
            titleIcon: DotsThreeOutlineVerticalIcon,
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
