<script lang="ts">
    import {
        ArrowClockwiseIcon,
        BookOpenTextIcon,
        ClockCounterClockwiseIcon,
        SpeakerHighIcon,
        SpeakerSlashIcon,
        TrashSimpleIcon,
        VibrateIcon,
        WaveformSlashIcon,
    } from "phosphor-svelte";
    import type { Component } from "svelte";
    import { hapticsEnabled } from "../hapticsStore";
    import { soundVolume, soundMuted } from "../soundStore";
    import SliderSetting from "../SliderSetting.svelte";
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
    import { ignoreTechCrystalBudget } from "../ignoreTechCrystalBudgetStore";
    import { reduceMotion } from "../reduceMotionStore";
    import { showOnboarding } from "../onboarding/onboardingStore";
    import { showToast } from "../toast";
    import { clearAll } from "../storage";
    import { t, resetLocale } from "svelte-whisper";
    import { getKeyboardActionLabel } from "../input";

    export let onBack: (() => void) | null = null;
    export let onClose: (() => void) | null = null;

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
                soundVolume.resetToDefault();
                soundMuted.resetToDefault();
                treeZoomScale.resetToDefault();
                textSize.resetToDefault();
                themeColor.resetToDefault();
                darkMode.resetToDefault();
                colorblindTreeColors.resetToDefault();
                uppercaseText.resetToDefault();
                showLevelSplash.resetToDefault();
                ignoreTechCrystalBudget.resetToDefault();
                reduceMotion.resetToDefault();
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
            onConfirm: () => {
                clearAll();
                window.location.reload();
            },
        });
    }
</script>

<SettingsPage title={$t("settings.pages.general")} {onBack}>
    <SideMenuSection title={$t("sideMenu.sections.accessibility")}>
        <LanguageDropdown />
        <SliderSetting
            label={$t("settings.sound")}
            ariaLabel={$t("settings.sound")}
            description={$t("settings.soundDescription")}
            icon={$soundMuted ? SpeakerSlashIcon as unknown as Component : SpeakerHighIcon as unknown as Component}
            value={$soundMuted ? 0 : $soundVolume}
            min={0}
            max={100}
            step={10}
            defaultNotchIndex={5}
            formatValue={(v) => $soundMuted ? $t("settings.soundMuted") : `${v}%`}
            resetIcon={$soundMuted ? SpeakerSlashIcon as unknown as Component : SpeakerHighIcon as unknown as Component}
            resetAriaLabel={$soundMuted ? "Unmute" : "Mute"}
            shortcut={getKeyboardActionLabel("toggleMute", $t)}
            onReset={() => soundMuted.set(!$soundMuted)}
            onChange={(v) => {
                soundVolume.set(v);
                if (v > 0 && $soundMuted) soundMuted.set(false);
                if (v === 0) soundMuted.set(true);
            }}
        />
        <ToggleSwitch
            checked={$hapticsEnabled}
            label={$t("settings.haptics")}
            ariaLabel={$t("settings.haptics")}
            description={$t("settings.hapticsDescription")}
            icon={VibrateIcon as unknown as Component}
            onToggle={() => hapticsEnabled.set(!$hapticsEnabled)}
        />
        <ToggleSwitch
            checked={$reduceMotion}
            label={$t("settings.reduceMotion")}
            ariaLabel={$t("settings.reduceMotion")}
            description={$t("settings.reduceMotionDescription")}
            icon={WaveformSlashIcon as unknown as Component}
            onToggle={() => reduceMotion.set(!$reduceMotion)}
        />
    </SideMenuSection>

    <SideMenuSection title={$t("sideMenu.sections.application")}>
        <FullscreenToggle />
        <InstallPwaButton title={true} />
        <Button
            on:click={() => {
                showOnboarding();
                onClose?.();
            }}
            description={$t("onboarding.showTutorialDescription")}
            icon={BookOpenTextIcon}
        >
            {$t("controls.tutorial")}
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
