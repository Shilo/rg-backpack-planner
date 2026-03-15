import type { Component } from "svelte";
import { CrosshairIcon, GavelIcon, ShieldIcon } from "phosphor-svelte";
import TechCrystalIcon from "./TechCrystalIcon.svelte";
import RootNodeIcon from "./RootNodeIcon.svelte";

export { TechCrystalIcon, RootNodeIcon };
export const GuardianIcon = GavelIcon;
export const VanguardIcon = CrosshairIcon;
export const CannonIcon = ShieldIcon;

export function getTreeIcon(treeId: string): Component | null {
    if (treeId === "guardian") return GuardianIcon as unknown as Component;
    if (treeId === "vanguard") return VanguardIcon as unknown as Component;
    if (treeId === "cannon") return CannonIcon as unknown as Component;
    return null;
}
