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

export { TechCrystalIcon, RootNodeIcon };
export const GuardianIcon = GavelIcon;
export const VanguardIcon = CrosshairIcon;
export const CannonIcon = ShieldIcon;

/** Premade build display name (from package.json) → icon component. Late PvE = Sword, Late PvP = Shield. */
export const premadeBuildIcons: Record<string, Component> = {
    Starter: SunIcon as unknown as Component,
    "Early Stun": SpiralIcon as unknown as Component,
    "Mid PvE": KnifeIcon as unknown as Component,
    "Late PvE": SwordIcon as unknown as Component,
    "Late PvP": ShieldIcon as unknown as Component,
};

export function getTreeIcon(treeId: string): Component | null {
    if (treeId === "guardian") return GuardianIcon as unknown as Component;
    if (treeId === "vanguard") return VanguardIcon as unknown as Component;
    if (treeId === "cannon") return CannonIcon as unknown as Component;
    return null;
}
