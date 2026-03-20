import type { Component } from "svelte";
import {
    CrosshairIcon,
    GavelIcon,
    KnifeIcon,
    ShieldIcon,
    SpiralIcon,
    SunIcon,
    SwordIcon,
} from "phosphor-svelte";
import TechCrystalIcon from "./TechCrystalIcon.svelte";
import RootNodeIcon from "./RootNodeIcon.svelte";
import ShiftKeyIcon from "./icons/ShiftKeyIcon.svelte";
import CtrlKeyIcon from "./icons/CtrlKeyIcon.svelte";

export { TechCrystalIcon, RootNodeIcon, ShiftKeyIcon, CtrlKeyIcon };
export const GuardianIcon = GavelIcon;
export const VanguardIcon = CrosshairIcon;
export const CannonIcon = ShieldIcon;

const RECOMMENDED_BUILD_ICONS = {
    CrosshairIcon, KnifeIcon, ShieldIcon, SpiralIcon, SunIcon, SwordIcon,
} as Record<string, Component>;

export function getRecommendedBuildIcon(iconName: string): Component | null {
    return RECOMMENDED_BUILD_ICONS[iconName] ?? null;
}

export function getTreeIcon(treeId: string): Component | null {
    if (treeId === "guardian") return GuardianIcon as unknown as Component;
    if (treeId === "vanguard") return VanguardIcon as unknown as Component;
    if (treeId === "cannon") return CannonIcon as unknown as Component;
    return null;
}
