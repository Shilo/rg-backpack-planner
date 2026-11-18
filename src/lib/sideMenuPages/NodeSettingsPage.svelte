<script lang="ts">
    import {
        CaretUpIcon,
        CoinsIcon,
        GraphIcon,
        TagIcon,
        MedalIcon,
        SparkleIcon,
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
    import { showLevelSplash } from "../showLevelSplashStore";
    import { ignoreTechCrystalBudget } from "../ignoreTechCrystalBudgetStore";
    import { showSkillName } from "../showSkillNameStore";
    import { t } from "svelte-whisper";
    import { getKeyboardActionLabel, touchPrimary } from "../input";

    export let onBack: (() => void) | null = null;

    $: nodePrimaryActionName = $t(
        $touchPrimary ? "input.primary.touch" : "input.primary.mouse",
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
    $: keyCyclePrimaryAction = getKeyboardActionLabel("cyclePrimaryAction", $t);

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
    <SideMenuSection title={$t("sideMenu.sections.behavior")}>
        <SegmentedControl
            label={nodePrimaryActionLabel}
            ariaLabel={nodePrimaryActionLabel}
            icon={CaretUpIcon as unknown as Component}
            options={nodePrimaryActionOptions}
            selectedIndex={nodePrimaryActionSelectedIndex}
            onChange={handleNodePrimaryActionChange}
            description={$t("settings.nodePrimaryActionDescription", {
                action: nodePrimaryActionName.toLowerCase(),
            })}
            shortcut={keyCyclePrimaryAction}
        />
        <SegmentedControl
            label={nodeLevelBehaviorLabel}
            ariaLabel={nodeLevelBehaviorLabel}
            icon={GraphIcon as unknown as Component}
            options={nodeLevelBehaviorOptions}
            selectedIndex={nodeLevelBehaviorSelectedIndex}
            onChange={handleNodeLevelBehaviorChange}
            description={$t("settings.nodeLevelBehaviorDescription")}
        />
        <ToggleSwitch
            checked={$ignoreTechCrystalBudget}
            label={$t("settings.ignoreTechCrystalBudget")}
            ariaLabel={$t("settings.ignoreTechCrystalBudget")}
            description={$t("settings.ignoreTechCrystalBudgetDescription")}
            icon={CoinsIcon as unknown as Component}
            onToggle={() =>
                ignoreTechCrystalBudget.set(!$ignoreTechCrystalBudget)}
        />
    </SideMenuSection>

    <SideMenuSection title={$t("sideMenu.sections.display")}>
        <ToggleSwitch
            checked={$showSkillName}
            label={$t("settings.showSkillName")}
            ariaLabel={$t("settings.showSkillName")}
            description={$t("settings.showSkillNameDescription")}
            icon={TagIcon as unknown as Component}
            onToggle={() => showSkillName.set(!$showSkillName)}
        />
        <ToggleSwitch
            checked={$showTier}
            label={$t("settings.showTier")}
            ariaLabel={$t("settings.showTier")}
            description={$t("settings.showTierDescription")}
            icon={MedalIcon as unknown as Component}
            onToggle={() => showTier.set(!$showTier)}
        />
        <ToggleSwitch
            checked={$showLevelSplash}
            label={$t("settings.showLevelSplash")}
            ariaLabel={$t("settings.showLevelSplash")}
            description={$t("settings.showLevelSplashDescription")}
            icon={SparkleIcon as unknown as Component}
            onToggle={() => showLevelSplash.set(!$showLevelSplash)}
        />
    </SideMenuSection>
</SettingsPage>
