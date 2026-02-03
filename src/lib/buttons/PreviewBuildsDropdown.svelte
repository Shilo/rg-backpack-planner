<script lang="ts">
    import {
        SunIcon,
        SpiralIcon,
        MoonIcon,
        ShareNetworkIcon,
        SwordIcon,
        LinkIcon,
    } from "phosphor-svelte";
    import type { Component } from "svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import { triggerHaptic } from "../haptics";
    import {
        parseEncodedFromUserInput,
        navigateToEncodedBuild,
    } from "../buildData/url";
    import { showToast } from "../toast";
    import { openLoadBuildModal } from "../loadBuildModal";
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - package.json import is valid
    import appPackage from "../../../package.json";

    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    export let onPreview: (() => void) | null = null;

    // Premade build key (from package.json) → icon component
    const premadeBuildIcons: Record<string, Component> = {
        starter: SunIcon,
        "early stun": SpiralIcon,
        "late pve": MoonIcon,
        "late pvp": SwordIcon,
    };

    // Dynamically get all premade builds from package.json
    const premadeBuilds = (() => {
        const builds = appPackage?.premadeBuilds;
        if (!builds || typeof builds !== "object") return [];

        return Object.entries(builds)
            .filter(
                ([, value]) => typeof value === "string" && value.trim() !== "",
            )
            .map(([key, value]) => ({
                name: key,
                code: value as string,
            }));
    })();

    function handlePremadeClick(buildCode: string) {
        triggerHaptic();
        onClose?.();
        const encoded = parseEncodedFromUserInput(buildCode);
        if (encoded) {
            navigateToEncodedBuild(encoded);
            onPreview?.();
        } else {
            showToast("Invalid build data", { tone: "negative" });
        }
    }

    function handleOpenLoadModal() {
        triggerHaptic();
        onClose?.();
        openLoadBuildModal(() => onPreview?.());
    }
</script>

<div use:portal class="dropdown-menu-portal" class:menu-open={isOpen}>
    <ContextMenu
        {x}
        {y}
        {isOpen}
        title="Preview Builds"
        onClose={() => onClose?.()}
    >
        <Button icon={LinkIcon} on:click={handleOpenLoadModal}>
            From Link/Code
        </Button>
        <div class="section-title">Recommended</div>
        <div class="premade-builds-list">
            {#each premadeBuilds as build}
                <Button
                    icon={premadeBuildIcons[build.name] ?? ShareNetworkIcon}
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
        font-size: 0.8rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(201, 214, 245, 0.75);
        padding-left: 4px;
        overflow-wrap: anywhere;
        word-break: break-word;
        hyphens: auto;
    }

    .premade-builds-list {
        max-height: min(400px, 40vh);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
</style>
