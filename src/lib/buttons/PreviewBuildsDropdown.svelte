<script lang="ts">
    import {
        SunIcon,
        SpiralIcon,
        ShieldIcon,
        ShareNetworkIcon,
        SwordIcon,
        LinkIcon,
    } from "phosphor-svelte";
    import type { Component } from "svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import {
        parseEncodedFromUserInput,
        navigateToEncodedBuild,
        getBuildNameFromEncoded,
    } from "../buildData/url";
    import { showToast } from "../toast";
    import { openLoadBuildModal } from "../loadBuildModal";
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - package.json import is valid
    import appPackage from "../../../package.json";
    import { t } from "svelte-whisper";

    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    export let onPreview: (() => void) | null = null;

    // Premade build key (from package.json) → icon component
    const premadeBuildIcons: Record<string, Component> = {
        Starter: SunIcon,
        "Early Stun": SpiralIcon,
        "Late PvE": ShieldIcon,
        "Late PvP": SwordIcon,
    };
    const premadeBuildLabelKeys: Record<string, string> = {
        Starter: "preview.premade.starter",
        "Early Stun": "preview.premade.earlyStun",
        "Late PvE": "preview.premade.latePve",
        "Late PvP": "preview.premade.latePvp",
    };

    // Dynamically get all premade builds from package.json
    $: premadeBuilds = (() => {
        const builds = appPackage?.premadeBuilds;
        if (!Array.isArray(builds)) return [];

        return builds
            .filter(
                (value): value is string =>
                    typeof value === "string" && value.trim() !== "",
            )
            .map((value) => {
                const rawName = getBuildNameFromEncoded(value) ?? $t("preview.title");
                const localizedName = premadeBuildLabelKeys[rawName]
                    ? $t(premadeBuildLabelKeys[rawName])
                    : rawName;
                return {
                    rawName,
                    name: localizedName,
                    code: value,
                };
            });
    })();

    function handlePremadeClick(buildCode: string) {
        onClose?.();
        const encoded = parseEncodedFromUserInput(buildCode);
        if (encoded) {
            navigateToEncodedBuild(encoded);
            onPreview?.();
        } else {
            showToast($t("preview.invalidBuildDataToast"), { tone: "negative" });
        }
    }

    function handleOpenLoadModal() {
        onClose?.();
        openLoadBuildModal(() => onPreview?.());
    }
</script>

<div use:portal class="dropdown-menu-portal" class:menu-open={isOpen}>
    <ContextMenu
        {x}
        {y}
        {isOpen}
        title={$t("preview.previewBuildsTitle")}
        onClose={() => onClose?.()}
    >
        <Button
            icon={LinkIcon}
            tooltipText={$t("preview.previewFromLinkTooltip")}
            on:click={handleOpenLoadModal}
        >
            {$t("preview.fromLinkOrCode")}
        </Button>
        <div class="section-title">{$t("preview.recommended")}</div>
        <div class="premade-builds-list">
            {#each premadeBuilds as build}
                <Button
                    icon={premadeBuildIcons[build.rawName] ?? ShareNetworkIcon}
                    tooltipText={$t("preview.previewBuildTooltip", {
                        name: build.name,
                    })}
                    on:click={() => handlePremadeClick(build.code)}
                >
                    {build.name}
                </Button>
            {/each}
        </div>
    </ContextMenu>
</div>

<style>
    .dropdown-menu-portal {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: var(--z-index-context-menu-over-modal);
    }

    .dropdown-menu-portal.menu-open {
        pointer-events: auto;
    }

    .section-title {
        margin: 0;
        font-size: var(--font-base);
        letter-spacing: var(--tracking);
        text-transform: uppercase;
        color: var(--text-disabled);
        padding-left: var(--spacing-sm);
        overflow-wrap: anywhere;
        word-break: break-word;
        hyphens: auto;
    }

    .premade-builds-list {
        max-height: min(400px, 40vh);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
</style>
