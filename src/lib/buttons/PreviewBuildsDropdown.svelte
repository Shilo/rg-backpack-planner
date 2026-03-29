<script lang="ts">
    import { LinkIcon, ScalesIcon, ShareNetworkIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import ButtonGroup from "../ButtonGroup.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import {
        parseEncodedFromUserInput,
        navigateToEncodedBuild,
    } from "../buildData/url";
    import { showToast } from "../toast";
    import { openLoadBuildModal } from "../loadBuildModal";
    import { t } from "svelte-whisper";
    import { TechCrystalIcon } from "../customIcons";
    import { activeTabs } from "../techCrystalStore";
    import { activeBuildName } from "../buildPresetsStore";
    import { toTitleCase } from "../stringUtil";
    import {
        decodeAndStartCompare,
        type CompareBuildSource,
    } from "../compare/compareStore";
    import { mapRecommendedBuilds } from "../compare/compareBuilds";

    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    export let onPreview: (() => void) | null = null;

    // Read recommended builds from the shared registry so loading and sharing stay in sync.
    $: premadeBuilds = mapRecommendedBuilds($activeTabs, $t);

    function handlePremadeClick(buildCode: string) {
        onClose?.();
        const encoded = parseEncodedFromUserInput(buildCode);
        if (encoded) {
            navigateToEncodedBuild(encoded);
            onPreview?.();
        } else {
            showToast($t("preview.invalidBuildDataToast"), {
                tone: "negative",
            });
        }
    }

    function handleCompareRecommended(buildCode: string, name: string) {
        const source: CompareBuildSource = { type: "preview", encoded: buildCode };
        if (!decodeAndStartCompare(buildCode, name, source)) {
            showToast($t("preview.invalidBuildDataToast"), { tone: "negative" });
            return;
        }
        onClose?.();
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
        anchorBelow
    >
        <Button
            icon={LinkIcon}
            tooltipText={$t("preview.previewFromLinkTooltip")}
            on:click={handleOpenLoadModal}
            arrow="right"
        >
            {$t("preview.fromLinkOrCode")}
        </Button>
        <div class="section-title">{$t("preview.recommended")}</div>
        <div class="premade-builds-list">
            {#each premadeBuilds as build}
                <ButtonGroup fill>
                    <Button
                        icon={build.icon ?? ShareNetworkIcon}
                        tooltipText={$t("preview.previewBuildTooltip", {
                            name: build.name,
                        })}
                        description={build.tcSpent > 0
                            ? $t("preview.techCrystalsDescription", {
                                  count: build.tcSpent.toLocaleString(),
                              })
                            : undefined}
                        descriptionIcon={build.tcSpent > 0 ? TechCrystalIcon : null}
                        on:click={() => handlePremadeClick(build.code)}
                    >
                        {build.index}. {build.name}
                    </Button>
                    <Button
                        class="compare-btn"
                        tooltipText={$t("compare.compareWithActiveTooltip", { name: toTitleCase($activeBuildName) })}
                        icon={ScalesIcon}
                        on:click={() =>
                            handleCompareRecommended(build.code, build.name)}
                    />
                </ButtonGroup>
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
        color: var(--text-disabled);
        padding-left: var(--spacing-sm);
        overflow-wrap: break-word;
    }

    :global(.compare-btn) {
        flex: 0 0 auto !important;
        width: 36px !important;
        min-width: 36px !important;
        background: var(--surface) !important;
    }

    .premade-builds-list {
        max-height: min(400px, 40vh);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
</style>
