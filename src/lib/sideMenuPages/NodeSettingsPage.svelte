<script lang="ts">
    import {
        ArrowUpIcon,
        GraphIcon,
        TagIcon,
        MedalIcon,
    } from "phosphor-svelte";
    import type { Component } from "svelte";
    import SettingsPage from "./SettingsPage.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import SegmentedControl from "../SegmentedControl.svelte";
    import ToggleSwitch from "../ToggleSwitch.svelte";
    import {
        nodePrimaryAction,
        isNodePrimaryAction,
    } from "../nodePrimaryActionStore";
    import {
        nodeLevelBehavior,
        isNodeLevelBehavior,
    } from "../nodeLevelBehaviorStore";
    import { showTier } from "../showTierStore";
    import { showSkillName } from "../showSkillNameStore";
    import { onMount } from "svelte";
    import { t } from "svelte-whisper";

    export let onBack: (() => void) | null = null;

    let isTouchPrimaryPlatform = false;

    const detectTouchPrimaryPlatform = () => {
        if (typeof window === "undefined") return false;
        const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
        const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        const hasTouchPoints =
            typeof navigator !== "undefined" &&
            (navigator.maxTouchPoints ?? 0) > 0;
        return !hasFinePointer && (hasCoarsePointer || hasTouchPoints);
    };

    onMount(() => {
        isTouchPrimaryPlatform = detectTouchPrimaryPlatform();
    });

    $: nodePrimaryActionName = $t(
        isTouchPrimaryPlatform
            ? "settings.nodePrimaryActionTouch"
            : "settings.nodePrimaryActionLeftClick",
    );
    $: nodePrimaryActionLabel = $t("settings.nodePrimaryActionTitle", {
        primaryAction: nodePrimaryActionName,
    });
    $: nodePrimaryActionOptions = [
        $t("nodeMenu.incrementOne"),
        $t("nodeMenu.incrementTen"),
        $t("nodeMenu.incrementTier"),
    ];
    $: nodePrimaryActionSelectedIndex = $nodePrimaryAction;
    $: nodeLevelBehaviorLabel = $t("settings.nodeLevelBehavior");
    $: nodeLevelBehaviorOptions = [
        $t("settings.nodeLevelBehaviorSolo"),
        $t("settings.nodeLevelBehaviorSync"),
    ];
    $: nodeLevelBehaviorSelectedIndex = $nodeLevelBehavior;

    function handleNodePrimaryActionChange(index: number) {
        if (!isNodePrimaryAction(index)) return;
        nodePrimaryAction.set(index);
    }

    function handleNodeLevelBehaviorChange(index: number) {
        if (!isNodeLevelBehavior(index)) return;
        nodeLevelBehavior.set(index);
    }
</script>

<SettingsPage title={$t("settings.pages.node")} {onBack}>
    <SideMenuSection title={$t("sideMenu.sections.node")}>
        <SegmentedControl
            label={nodePrimaryActionLabel}
            ariaLabel={nodePrimaryActionLabel}
            icon={ArrowUpIcon as unknown as Component}
            options={nodePrimaryActionOptions}
            selectedIndex={nodePrimaryActionSelectedIndex}
            onChange={handleNodePrimaryActionChange}
            tooltipText={$t("settings.nodePrimaryActionTooltip")}
        />
        <SegmentedControl
            label={nodeLevelBehaviorLabel}
            ariaLabel={nodeLevelBehaviorLabel}
            icon={GraphIcon as unknown as Component}
            options={nodeLevelBehaviorOptions}
            selectedIndex={nodeLevelBehaviorSelectedIndex}
            onChange={handleNodeLevelBehaviorChange}
            tooltipText={$t("settings.nodeLevelBehaviorTooltip")}
        />
        <ToggleSwitch
            checked={$showSkillName}
            label={$t("settings.showSkillName")}
            ariaLabel={$t("settings.showSkillName")}
            tooltipText={$t("settings.showSkillNameTooltip")}
            icon={TagIcon as unknown as Component}
            onToggle={() => showSkillName.set(!$showSkillName)}
        />
        <ToggleSwitch
            checked={$showTier}
            label={$t("settings.showTier")}
            ariaLabel={$t("settings.showTier")}
            tooltipText={$t("settings.showTierTooltip")}
            icon={MedalIcon as unknown as Component}
            onToggle={() => showTier.set(!$showTier)}
        />
    </SideMenuSection>
</SettingsPage>
