<script lang="ts">
    import { tick } from "svelte";
    import {
        UserIcon,
        GithubLogoIcon,
        GameControllerIcon,
        BookOpenTextIcon,
        InfoIcon,
        WrenchIcon,
    } from "phosphor-svelte";
    import type { AboutScrollTarget } from "./SideMenuSettingsPage.svelte";
    import packageInfo from "../../../package.json";
    import Button from "../Button.svelte";
    import SettingsPage from "./SettingsPage.svelte";
    import SettingsLinkItem from "./SettingsLinkItem.svelte";
    import Accordion from "../Accordion.svelte";
    import AppIcon from "../icons/AppIcon.svelte";
    import { getCurrentVersion } from "../latestUsedVersionStore";
    import { showOnboarding } from "../onboarding/onboardingStore";
    import { t } from "svelte-whisper";
    import { showToast } from "../toast";

    export let onBack: (() => void) | null = null;
    export let onClose: (() => void) | null = null;
    export let aboutScrollTarget: AboutScrollTarget | null = null;
    export let onAboutScrollHandled: (() => void) | null = null;

    function handleTutorial() {
        showOnboarding();
        onClose?.();
    }

    let advancedOpened = false;
    let gameRulesSectionElement: HTMLDivElement | null = null;
    let handledAboutScrollTarget: AboutScrollTarget | null = null;

    // Easter egg: tap version number 7 times
    let versionTaps = 0;
    let versionTapTimer: ReturnType<typeof setTimeout> | null = null;
    let easterEggFound = false;

    function handleVersionTap() {
        if (easterEggFound) return;
        versionTaps++;
        if (versionTapTimer) clearTimeout(versionTapTimer);
        versionTapTimer = setTimeout(() => { versionTaps = 0; }, 2000);
        if (versionTaps >= 7) {
            easterEggFound = true;
            versionTaps = 0;
            showToast($t("about.easterEggToast"), { durationMs: 3500 });
        }
    }

    const version = getCurrentVersion();

    const authorName = packageInfo.author?.name ?? "";
    const authorUrl = packageInfo.author?.url ?? "";
    const sourceUrl = (packageInfo?.app?.sourceUrl ?? undefined) as
        | string
        | undefined;
    const gameName = packageInfo.game?.name ?? "";
    const gameUrl = packageInfo.game?.url ?? "";

    function openUrl(url: string | undefined) {
        if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    }

    async function scrollGameRulesIntoView() {
        await tick();
        gameRulesSectionElement?.scrollIntoView({
            block: "start",
            behavior: "smooth"
        });
        onAboutScrollHandled?.();
    }

    $: appName = $t("app.name");
    $: appDescription = $t("app.description");
    $: versionLabel = version === "unknown" ? "" : version;
    $: if (aboutScrollTarget === null) {
        handledAboutScrollTarget = null;
    }
    $: if (
        aboutScrollTarget === "game-rules" &&
        handledAboutScrollTarget !== aboutScrollTarget
    ) {
        handledAboutScrollTarget = aboutScrollTarget;
        void scrollGameRulesIntoView();
    }
</script>

<SettingsPage title={$t("settings.pages.about")} {onBack} advancedTitle={$t("settings.systemInformation")} advancedIcon={WrenchIcon} onAdvancedOpen={() => { advancedOpened = true; }}>
    <div class="about-card">
        <div class="about-app-row">
            <span class="about-app-icon" aria-hidden="true">
                <AppIcon />
            </span>
            <div class="about-app-text">
                <span class="about-app-name">{appName}</span>
                {#if appDescription}
                    <span class="about-app-description">{appDescription}</span>
                {/if}
            </div>
        </div>
        {#if versionLabel}
            <button class="about-info-row about-info-row--tappable" on:click={handleVersionTap}>
                <span class="about-info-label"
                    >{$t("settings.aboutVersion")}</span
                >
                <span class="about-info-value">{versionLabel}</span>
            </button>
        {/if}
    </div>

    <div class="about-links-card">
        {#if authorUrl && authorName}
            <SettingsLinkItem
                icon={UserIcon}
                label={$t("settings.aboutAuthor")}
                value={authorName}
                external
                onClick={() => openUrl(authorUrl)}
            />
        {/if}
        {#if sourceUrl}
            <SettingsLinkItem
                icon={GithubLogoIcon}
                label={$t("settings.aboutSourceCode")}
                value="GitHub"
                external
                onClick={() => openUrl(sourceUrl)}
            />
        {/if}
        {#if gameUrl && gameName}
            <SettingsLinkItem
                icon={GameControllerIcon}
                label={$t("settings.aboutGame")}
                value={gameName}
                external
                onClick={() => openUrl(gameUrl)}
            />
        {/if}
    </div>

    <Button
        on:click={handleTutorial}
        description={$t("onboarding.showTutorialDescription")}
        icon={BookOpenTextIcon}
    >
        {$t("controls.tutorial")}
    </Button>

    <div bind:this={gameRulesSectionElement}>
        <Accordion title={$t("sideMenu.sections.instructions")} icon={InfoIcon} isOpen>
            {#each [0, 1, 2, 3, 4] as i}
                <div class="rule-row">
                    <span class="rule-number">{i + 1}</span>
                    <span class="rule-text">{$t(`trees.rules.${i}`)}</span>
                </div>
            {/each}
        </Accordion>
    </div>

    <svelte:fragment slot="advancedSettings">
        {#if advancedOpened}
            {#await import("./DebugInfoSection.svelte") then { default: DebugInfoSection }}
                <svelte:component this={DebugInfoSection} />
            {/await}
        {/if}
    </svelte:fragment>
</SettingsPage>

<style>
    .about-card {
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .about-app-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
        padding: var(--spacing-xl);
    }

    .about-app-icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        color: var(--text-muted);
    }

    .about-app-icon :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    .about-app-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .about-app-name {
        font-size: var(--font-lg);
        font-weight: var(--weight-bold);
        letter-spacing: var(--tracking-tight);
        color: var(--text);
        line-height: var(--leading-tight);
    }

    .about-app-description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    .about-info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-md) var(--spacing-xl);
        border-top: var(--border-width) solid var(--border);
    }

    button.about-info-row--tappable {
        all: unset;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) var(--spacing-lg);
        border-top: var(--border-width) solid var(--border);
        width: 100%;
        box-sizing: border-box;
        cursor: default;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
    }

    .about-info-label {
        font-size: var(--font-base);
        color: var(--text-muted);
    }

    .about-info-value {
        font-size: var(--font-base);
        color: var(--text-disabled);
    }

    .about-links-card {
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .about-links-card :global(.settings-link-item:last-child) {
        border-bottom: none;
    }

    .rule-row {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-lg);
        padding: var(--spacing-lg) var(--spacing-xl);
        border-bottom: var(--border-width) solid var(--border-subtle);
    }

    .rule-row:last-child {
        border-bottom: none;
    }

    .rule-number {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: var(--weight-bold);
        color: var(--accent-light);
        background: color-mix(in srgb, var(--accent) 8%, var(--bg-raised));
        border: 1.5px solid color-mix(in srgb, var(--accent) 20%, var(--border));
        border-radius: var(--radius-sm);
        margin-top: 1px;
        box-sizing: border-box;
    }

    .rule-text {
        font-size: var(--font-base);
        line-height: 1.5;
        color: var(--text-muted);
        flex: 1;
    }
</style>
