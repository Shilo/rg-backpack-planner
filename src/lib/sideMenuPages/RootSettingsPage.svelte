<script lang="ts">
    import {
        CirclesThreeIcon,
        EyeIcon,
        GearSixIcon,
        InfoIcon,
        PaletteIcon,
    } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import BuildPresetsButton from "../buttons/BuildPresetsButton.svelte";
    import FocusInViewButton from "../buttons/FocusInViewButton.svelte";
    import ResetAllTreesButton from "../buttons/ResetAllTreesButton.svelte";
    import ResetTreeButton from "../buttons/ResetTreeButton.svelte";
    import ShareBuildButton from "../buttons/ShareBuildButton.svelte";
    import TechCrystalsButton from "../buttons/TechCrystalsButton.svelte";
    import PreviewBuildsDropdown from "../buttons/PreviewBuildsDropdown.svelte";
    import SettingsPage from "./SettingsPage.svelte";
    import SettingsNavButton from "./SettingsNavButton.svelte";
    import SideMenuPreviewSection from "./SideMenuPreviewSection.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import { isPreviewMode } from "../previewModeStore";
    import { treeLevels } from "../treeLevelsStore";
    import type { TreeViewState } from "../Tree.svelte";
    import type { SettingsPageId } from "./SideMenuSettingsPage.svelte";
    import { t } from "svelte-whisper";

    export let activeTreeName = "";
    export let activeTreeIndex = 0;
    export let activeTreeViewState: TreeViewState | null = null;
    export let activeTreeFocusViewState: TreeViewState | null = null;
    export let onClose: (() => void) | null = null;
    export let onResetAll: (() => void) | null = null;
    export let onResetTree: (() => void) | null = null;
    export let onResetBranch:
        | ((branch: import("../treeLevelsStore").TreeBranchKey) => void)
        | null = null;
    export let onFocusInView: (() => void) | null = null;
    export let onNavigate: ((page: SettingsPageId) => void) | null = null;
    export let activeTreeNodes: import("../../types/tree").Node[] = [];
    export let activeTreeId = "";

    let previewButtonElement: HTMLButtonElement | null = null;
    let dropdownMenuOpen = false;
    let dropdownMenuX = 0;
    let dropdownMenuY = 0;

    function handlePreviewDropdownClick() {
        if (!previewButtonElement) return;
        const rect = previewButtonElement.getBoundingClientRect();
        dropdownMenuX = rect.left + rect.width / 2;
        dropdownMenuY = rect.bottom + 8;
        dropdownMenuOpen = true;
    }

    function closeDropdownMenu() {
        dropdownMenuOpen = false;
    }
</script>

<SideMenuPreviewSection />

<SettingsPage>
    <SideMenuSection title={$t("sideMenu.sections.build")}>
        <TechCrystalsButton disabled={$isPreviewMode} {activeTreeIndex} />
        <BuildPresetsButton disabled={$isPreviewMode} />
        <div class="button-group build-share-row">
            <ShareBuildButton
                title={$t("settings.shareButton")}
                description={$t("settings.shareDescription")}
                disabled={$isPreviewMode}
                onComposeScreenshot={() => onClose?.()}
            />
            <Button
                class="dropdown-button"
                bind:element={previewButtonElement}
                on:click={handlePreviewDropdownClick}
                description={$t("settings.previewDescription")}
                icon={EyeIcon}
                arrow="down"
            >
                {$t("settings.previewButton")}
            </Button>
        </div>
    </SideMenuSection>

    <SideMenuSection
        title={activeTreeName
            ? $t("trees.named", { label: activeTreeName })
            : $t("trees.generic")}
    >
        <ResetTreeButton
            onReset={() => {
                onResetTree?.();
                onClose?.();
            }}
            onResetBranch={onResetBranch ?? undefined}
            levelsById={$treeLevels[activeTreeIndex] ?? null}
            treeLabel={activeTreeName}
            treeNodes={activeTreeNodes}
            treeId={activeTreeId}
        />
        <ResetAllTreesButton
            onResetAll={() => {
                onResetAll?.();
                onClose?.();
            }}
            levelsByTree={$treeLevels}
        />
        <FocusInViewButton
            {onFocusInView}
            onPress={() => onClose?.()}
            viewState={activeTreeViewState}
            focusViewState={activeTreeFocusViewState}
        />
    </SideMenuSection>

    <SideMenuSection title={$t("sideMenu.tabs.settings.label")}>
        <SettingsNavButton
            icon={GearSixIcon}
            title={$t("settings.pages.general")}
            description={$t("settings.pages.generalDescription")}
            onClick={() => onNavigate?.("general")}
            data-page="general"
        />
        <SettingsNavButton
            icon={PaletteIcon}
            title={$t("settings.pages.appearance")}
            description={$t("settings.pages.appearanceDescription")}
            onClick={() => onNavigate?.("appearance")}
            data-page="appearance"
        />
        <SettingsNavButton
            icon={CirclesThreeIcon}
            title={$t("settings.pages.node")}
            description={$t("settings.pages.nodeDescription")}
            onClick={() => onNavigate?.("node")}
            data-page="node"
        />
        <SettingsNavButton
            icon={InfoIcon}
            title={$t("settings.pages.about")}
            description={$t("settings.pages.aboutDescription")}
            onClick={() => onNavigate?.("about")}
            data-page="about"
        />
    </SideMenuSection>
</SettingsPage>

<PreviewBuildsDropdown
    x={dropdownMenuX}
    y={dropdownMenuY}
    isOpen={dropdownMenuOpen}
    onClose={closeDropdownMenu}
    onPreview={() => onClose?.()}
/>

<style>
    :global(
            .side-menu-section .button:has(.button-text:not(:empty)),
            .side-menu-section .button-group
        ) {
        min-width: 0;
    }

    .build-share-row :global(.button) {
        flex: 1 1 auto;
    }

    .build-share-row > :global(:first-child) {
        border-right: none;
    }

    .build-share-row > :global(.dropdown-button) {
        border-left: var(--border-width) solid var(--border);
    }
</style>
