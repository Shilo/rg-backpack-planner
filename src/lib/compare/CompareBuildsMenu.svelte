<script lang="ts">
    import { LinkIcon, ScalesIcon, ShareNetworkIcon } from "phosphor-svelte";
    import type { Component } from "svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import { activeBuildName, buildPresetsStore } from "../buildPresetsStore";
    import { isPreviewMode } from "../previewModeStore";
    import { parseEncodedFromUserInput } from "../buildData/url";
    import { activeTabs } from "../techCrystalStore";
    import { showToast } from "../toast";
    import { openModal } from "../modalStore";
    import { t } from "svelte-whisper";
    import { watch } from "../watch.svelte";
    import { TechCrystalIcon } from "../customIcons";
    import { getDisplayPresetName } from "../i18n";
    import { truncateText, toTitleCase } from "../stringUtil";
    import { decodeAndStartCompare, type CompareBuildSource } from "./compareStore";
    import { mapRecommendedBuilds } from "./compareBuilds";
    import { previewRecommendedBuild } from "../buildData/recommended";

    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    /** Called when the user confirms a selection (distinct from dismissal). */
    export let onSelect: (() => void) | null = null;

    $: presets = $buildPresetsStore.presets
        .filter((p) => $isPreviewMode || p.id !== $buildPresetsStore.active)
        .map((p) => ({
            id: p.id,
            name: getDisplayPresetName(p.name),
            buildCode: p.buildCode,
        }));

    let premadeBuilds!: ReturnType<typeof mapRecommendedBuilds>;
    watch(() => {
        premadeBuilds = mapRecommendedBuilds($activeTabs, t)
            .filter((b) => b.code !== $previewRecommendedBuild?.encoded);
    });

    function handleBuildClick(
        buildCode: string,
        name: string,
        source: CompareBuildSource,
    ) {
        if (!decodeAndStartCompare(buildCode, name, source)) {
            showToast(t("preview.invalidBuildDataToast"), {
                tone: "negative",
            });
            return;
        }
        onSelect?.();
        onClose?.();
    }

    function handleLoadFromCode() {
        onSelect?.();
        onClose?.();
        openModal({
            type: "textInput",
            title: t("compare.compareBuilds"),
            titleIcon: ScalesIcon as unknown as Component,
            message: t("preview.loadModalMessage"),
            textInput: {
                label: t("modal.loadBuild.inputLabel"),
                value: "",
                placeholder: t("modal.loadBuild.placeholder"),
            },
            confirmLabel: t("compare.compareBuilds"),
            cancelLabel: t("common.cancel"),
            onConfirm: (value) => {
                if (typeof value !== "string") return;
                const raw = value.trim();
                if (!raw) return;
                const encoded = parseEncodedFromUserInput(raw);
                if (!encoded) {
                    showToast(t("modal.loadBuild.invalidLinkOrDataToast"), {
                        tone: "negative",
                    });
                    return;
                }
                if (
                    !decodeAndStartCompare(encoded, "Build", {
                        type: "preview",
                        encoded,
                    })
                ) {
                    showToast(t("preview.invalidBuildDataToast"), {
                        tone: "negative",
                    });
                }
            },
        });
    }
</script>

<div use:portal class="compare-menu-portal" class:menu-open={isOpen}>
    <ContextMenu
        {x}
        {y}
        {isOpen}
        title={t("compare.compareBuildWith", { name: toTitleCase($activeBuildName) })}
        onClose={() => onClose?.()}
        anchorBelow
    >
        <Button
            icon={LinkIcon}
            on:click={handleLoadFromCode}
            arrow="right"
        >
            {t("compare.fromCode")}
        </Button>

        {#if presets.length > 0}
            <div class="section-title">{t("compare.personalPresets")}</div>
            <div class="compare-builds-list">
                {#each presets as preset}
                    <Button
                        on:click={() =>
                            handleBuildClick(preset.buildCode, preset.name, {
                                type: "preset",
                                id: preset.id,
                            })}
                    >
                        {truncateText(preset.name)}
                    </Button>
                {/each}
            </div>
        {/if}

        {#if premadeBuilds.length > 0}
            <div class="section-title">{t("preview.recommended")}</div>
            <div class="compare-builds-list">
                {#each premadeBuilds as build}
                    <Button
                        icon={build.icon ?? ShareNetworkIcon}
                        description={build.tcSpent > 0
                            ? t("preview.techCrystalsDescription", {
                                  count: build.tcSpent.toLocaleString(),
                              })
                            : undefined}
                        descriptionIcon={build.tcSpent > 0
                            ? TechCrystalIcon
                            : null}
                        on:click={() =>
                            handleBuildClick(build.code, build.name, {
                                type: "preview",
                                encoded: build.code,
                            })}
                    >
                        {build.index}. {build.name}
                    </Button>
                {/each}
            </div>
        {/if}
    </ContextMenu>
</div>

<style>
    .compare-menu-portal {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: var(--z-index-context-menu-share);
    }

    .compare-menu-portal.menu-open {
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

    .compare-builds-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
</style>
