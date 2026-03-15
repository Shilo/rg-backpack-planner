import type { Component } from "svelte";
import {
    ArrowsOutCardinalIcon,
    CursorClickIcon,
    HandGrabbingIcon,
    HandTapIcon,
    MouseLeftClickIcon,
    MouseMiddleClickIcon,
    MouseRightClickIcon,
    MouseScrollIcon,
} from "phosphor-svelte";
import { RootNodeIcon, TechCrystalIcon } from "../customIcons";
import LongPressIcon from "../icons/LongPressIcon.svelte";
import PinchIcon from "../icons/PinchIcon.svelte";
import type { Direction } from "./paneLayout";

export type OnboardingStepId = "nodes" | "hud" | "root" | "tree";
export type OnboardingTarget = "node" | "hud" | "root" | "tree";
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
};

export function createOnboardingSteps({
    translate,
    isTouch,
    primaryInputIcon,
    primaryInputLabel,
    compactLayout,
    targetRegion,
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

    const hudCards = [
        {
            icon: primaryInputIcon,
            label: primaryInputLabel,
            description: translate("onboarding.techCrystalBudget"),
        },
        {
            icon: primaryInputIcon,
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

    return [
        {
            id: "nodes",
            target: "node",
            direction: targetRegion === "right" ? "left" : "right",
            title: translate("onboarding.nodesSection"),
            titleIcon: CursorClickIcon,
            variant: "accent",
            cards: nodeCards,
        },
        {
            id: "hud",
            target: "hud",
            direction: "left",
            title: translate("onboarding.hudSection"),
            titleIcon: TechCrystalIcon,
            variant: "muted",
            cards: hudCards,
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
    ];
}
