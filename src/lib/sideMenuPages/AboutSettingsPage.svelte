<script lang="ts">
    import {
        UserIcon,
        GithubLogoIcon,
        GameControllerIcon,
    } from "phosphor-svelte";
    import packageInfo from "../../../package.json";
    import SettingsPage from "./SettingsPage.svelte";
    import SettingsLinkItem from "./SettingsLinkItem.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import NumberedList from "../NumberedList.svelte";
    import AppIcon from "../icons/AppIcon.svelte";
    import { getCurrentVersion } from "../latestUsedVersionStore";
    import { t } from "svelte-whisper";

    export let onBack: (() => void) | null = null;

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

    $: appName = $t("app.name");
    $: appDescription = $t("app.description");
    $: versionLabel = version === "unknown" ? "" : version;
</script>

<SettingsPage title={$t("settings.pages.about")} {onBack}>
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
            <div class="about-info-row">
                <span class="about-info-label"
                    >{$t("settings.aboutVersion")}</span
                >
                <span class="about-info-value">{versionLabel}</span>
            </div>
        {/if}
    </div>

    <div class="about-links-card">
        {#if authorUrl && authorName}
            <SettingsLinkItem
                icon={UserIcon}
                label={$t("settings.aboutAuthor")}
                value={authorName}
                onClick={() => openUrl(authorUrl)}
            />
        {/if}
        {#if sourceUrl}
            <SettingsLinkItem
                icon={GithubLogoIcon}
                label={$t("settings.aboutSourceCode")}
                value="GitHub"
                onClick={() => openUrl(sourceUrl)}
            />
        {/if}
        {#if gameUrl && gameName}
            <SettingsLinkItem
                icon={GameControllerIcon}
                label={$t("settings.aboutGame")}
                value={gameName}
                onClick={() => openUrl(gameUrl)}
            />
        {/if}
    </div>

    <SideMenuSection title={$t("sideMenu.sections.instructions")}>
        <NumberedList
            items={[0, 1, 2, 3, 4].map((i) => $t(`trees.rules.${i}`))}
        />
    </SideMenuSection>
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
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
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
        gap: 2px;
    }

    .about-app-name {
        font-size: var(--font-base);
        font-weight: var(--weight-bold);
        color: var(--text);
        line-height: var(--leading);
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
        padding: var(--spacing-sm) var(--spacing-lg);
        border-top: var(--border-width) solid var(--border);
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
</style>
