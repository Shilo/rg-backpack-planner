<script lang="ts">
    import {
        ArrowClockwiseIcon,
        BookOpenTextIcon,
        CloudCheckIcon,
        CloudIcon,
        ClockCounterClockwiseIcon,
        TrashSimpleIcon,
        VibrateIcon,
    } from "phosphor-svelte";
    import type { Component } from "svelte";
    import { CLOUD_SAVE_ENABLED } from "../../config/cloudSave";
    import { cloudSyncStore } from "../cloudSyncStore";
    import { hapticsEnabled } from "../hapticsStore";
    import Button from "../Button.svelte";
    import FullscreenToggle from "../buttons/FullscreenToggle.svelte";
    import InstallPwaButton from "../buttons/InstallPwaButton.svelte";
    import LanguageDropdown from "../buttons/LanguageDropdown.svelte";
    import SettingsPage from "./SettingsPage.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import ToggleSwitch from "../ToggleSwitch.svelte";
    import { openModal } from "../modalStore";
    import { nodePrimaryAction } from "../nodePrimaryActionStore";
    import { nodeLevelBehavior } from "../nodeLevelBehaviorStore";
    import { showTier } from "../showTierStore";
    import { showSkillName } from "../showSkillNameStore";
    import { treeZoomScale } from "../treeZoomStore";
    import { textSize } from "../textSizeStore";
    import { themeColor } from "../themeColorStore";
    import { darkMode } from "../darkModeStore";
    import { colorblindTreeColors } from "../colorblindTreeColorsStore";
    import { uppercaseText } from "../uppercaseTextStore";
    import { showLevelSplash } from "../showLevelSplashStore";
    import { showOnboarding } from "../onboarding/onboardingStore";
    import { showToast } from "../toast";
    import { clearAll } from "../storage";
    import { t, resetLocale } from "svelte-whisper";

    export let onBack: (() => void) | null = null;
    export let onClose: (() => void) | null = null;

    let cloudSaveMenuOpen = false;
    let cloudSaveMenuX = 0;
    let cloudSaveMenuY = 0;

    function handleResetSettings() {
        openModal({
            type: "confirm",
            title: $t("modal.resetSettings.title"),
            titleIcon: ClockCounterClockwiseIcon as unknown as Component,
            message: $t("modal.resetSettings.message"),
            confirmLabel: $t("modal.resetSettings.confirmLabel"),
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            onConfirm: () => {
                nodePrimaryAction.resetToDefault();
                nodeLevelBehavior.resetToDefault();
                showTier.resetToDefault();
                showSkillName.resetToDefault();
                hapticsEnabled.resetToDefault();
                treeZoomScale.resetToDefault();
                textSize.resetToDefault();
                themeColor.resetToDefault();
                darkMode.resetToDefault();
                colorblindTreeColors.resetToDefault();
                uppercaseText.resetToDefault();
                showLevelSplash.resetToDefault();
                void resetLocale();

                showToast($t("modal.resetSettings.toast"));
                onClose?.();
            },
        });
    }

    async function handleReloadWindow() {
        if ("serviceWorker" in navigator) {
            try {
                const registration =
                    await navigator.serviceWorker.getRegistration();
                if (registration && navigator.onLine) {
                    await Promise.race([
                        registration.update(),
                        new Promise((_, reject) =>
                            setTimeout(
                                () => reject(new Error("Update timeout")),
                                2000,
                            ),
                        ),
                    ]);
                }
            } catch (error) {
                console.warn("Service worker update failed/timed out:", error);
            }
        }
        window.location.reload();
    }

    function handleClearAllData() {
        openModal({
            type: "confirm",
            title: $t("modal.clearAllData.title"),
            titleIcon: TrashSimpleIcon as unknown as Component,
            message: $t("modal.clearAllData.message"),
            confirmLabel: $t("modal.clearAllData.confirmLabel"),
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            onConfirm: async () => {
                try {
                    if (CLOUD_SAVE_ENABLED && $cloudSyncStore.enabled) {
                        const { stopCloudSync } = await import("../cloudSync/service");
                        const { signOut } = await import("../cloudSync/auth");
                        await signOut();
                        await stopCloudSync();
                    }
                } catch (error) {
                    console.error("Cloud Save sign-out during clear all failed:", error);
                }
                clearAll();
                window.location.reload();
            },
        });
    }

    async function handleCloudSaveClick(event: CustomEvent<MouseEvent>) {
        if ($cloudSyncStore.enabled) {
            const target = event.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            cloudSaveMenuX = rect.left + rect.width / 2;
            cloudSaveMenuY = rect.top;
            cloudSaveMenuOpen = true;
            return;
        }
        // Sign in
        try {
            const { signIn } = await import("../cloudSync/auth");
            const { initCloudSync } = await import("../cloudSync/init");
            await initCloudSync();
            await signIn();
            showToast($t("cloudSave.enabledToast"));
        } catch (error) {
            console.error("Cloud Save sign-in failed:", error);
            showToast($t("cloudSave.errorToast"), { tone: "negative" });
        }
    }
</script>

<SettingsPage title={$t("settings.pages.general")} {onBack}>
    <SideMenuSection title={$t("sideMenu.sections.accessibility")}>
        <LanguageDropdown />
        <ToggleSwitch
            checked={$hapticsEnabled}
            label={$t("settings.haptics")}
            ariaLabel={$t("settings.haptics")}
            description={$t("settings.hapticsDescription")}
            icon={VibrateIcon as unknown as Component}
            onToggle={() => hapticsEnabled.set(!$hapticsEnabled)}
        />
    </SideMenuSection>

    <SideMenuSection title={$t("sideMenu.sections.application")}>
        <FullscreenToggle />
        <InstallPwaButton title={true} />
        {#if CLOUD_SAVE_ENABLED}
            <Button
                on:click={handleCloudSaveClick}
                description={$t("cloudSave.description")}
                icon={$cloudSyncStore.enabled ? CloudCheckIcon : CloudIcon}
                positive={$cloudSyncStore.enabled}
            >
                {$t("cloudSave.label")}
            </Button>
            {#if cloudSaveMenuOpen}
                {#await import("../cloudSync/CloudSaveMenu.svelte") then module}
                    <svelte:component
                        this={module.default}
                        isOpen={cloudSaveMenuOpen}
                        x={cloudSaveMenuX}
                        y={cloudSaveMenuY}
                        onClose={() => { cloudSaveMenuOpen = false; }}
                    />
                {/await}
            {/if}
        {/if}
        <Button
            on:click={() => {
                showOnboarding();
                onClose?.();
            }}
            description={$t("onboarding.showTutorialDescription")}
            icon={BookOpenTextIcon}
        >
            {$t("onboarding.showTutorial")}
        </Button>
        <Button
            on:click={handleReloadWindow}
            description={$t("settings.reloadWindowDescription")}
            icon={ArrowClockwiseIcon}
        >
            {$t("settings.reloadWindow")}
        </Button>
    </SideMenuSection>

    <svelte:fragment slot="dangerZone">
        <div class="danger-zone">
            <div class="danger-zone-separator"></div>
            <h3 class="danger-zone-label">{$t("settings.storage")}</h3>
            <div class="danger-zone-content">
                <Button
                    on:click={handleResetSettings}
                    description={$t("settings.resetSettingsDescription")}
                    icon={ClockCounterClockwiseIcon}
                    arrow="right"
                    negative
                >
                    {$t("settings.resetSettings")}
                </Button>
                <Button
                    on:click={handleClearAllData}
                    description={$t("settings.clearAllDataDescription")}
                    icon={TrashSimpleIcon}
                    arrow="right"
                    negative
                >
                    {$t("settings.clearAllData")}
                </Button>
            </div>
        </div>
    </svelte:fragment>
</SettingsPage>

<style>
    .danger-zone {
        display: grid;
        gap: var(--spacing-md);
    }

    .danger-zone-separator {
        height: 1px;
        background: var(--danger-border);
        opacity: 0.5;
    }

    .danger-zone-label {
        margin: 0;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--danger-text);
    }

    .danger-zone-content {
        display: grid;
        gap: var(--spacing-md);
    }
</style>
