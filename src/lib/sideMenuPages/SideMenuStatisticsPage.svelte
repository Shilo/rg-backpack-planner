<script lang="ts">
    import CodeBlockTable from "../CodeBlockTable.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import {
        ShareIcon,
        CopySimpleIcon,
        TrendUpIcon,
        ArrowFatUpIcon,
        ChartBarIcon,
    } from "phosphor-svelte";
    import { TechCrystalIcon } from "../customIcons";
    import {
        treeLevelsTotal,
        treeLevelsGuardian,
        treeLevelsVanguard,
        treeLevelsCannon,
    } from "../treeLevelsStore";
    import {
        techCrystalsSpent,
        techCrystalsSpentGuardian,
        techCrystalsSpentVanguard,
        techCrystalsSpentCannon,
    } from "../techCrystalStore";
    import { skillBonuses, SKILL_DISPLAY_ORDER } from "../skillBonusStore";
    import { portal } from "../portal";
    import { t, formatNumber, formatPercent } from "svelte-whisper";
    import { get } from "svelte/store";
    import { showToast } from "../toast";

    let statsTable: CodeBlockTable | null = null;
    let statsRows: Array<
        [string | { text: string; icon?: any; iconWeight?: string }, string]
    > = [];

    let shareMenuOpen = false;
    let shareMenuX = 0;
    let shareMenuY = 0;
    let shareButtonElement: HTMLButtonElement | null = null;

    $: {
        const bonusRows: Array<[string, string]> = [];
        for (const skillId of SKILL_DISPLAY_ORDER) {
            const value = $skillBonuses.get(skillId);
            if (value !== undefined && value > 0) {
                bonusRows.push([$t(`skills.${skillId}`), formatPercent(value)]);
            }
        }

        const bonusDisplay: Array<
            [string | { text: string; icon?: any; iconWeight?: string }, string]
        > = bonusRows.length > 0 ? bonusRows : [[$t("common.none"), "0"]];

        statsRows = [
            [{ text: $t("statistics.backpackBonus"), icon: TrendUpIcon }, ""],
            ...bonusDisplay,
            [
                {
                    text: $t("statistics.techCrystalsSpent"),
                    icon: TechCrystalIcon,
                    iconWeight: "fill",
                },
                "",
            ],
            [$t("statistics.total"), formatNumber($techCrystalsSpent)],
            [$t("trees.guardian"), formatNumber($techCrystalsSpentGuardian)],
            [$t("trees.vanguard"), formatNumber($techCrystalsSpentVanguard)],
            [$t("trees.cannon"), formatNumber($techCrystalsSpentCannon)],
            [
                {
                    text: $t("statistics.backpackNodeLevels"),
                    icon: ArrowFatUpIcon,
                },
                "",
            ],
            [$t("statistics.total"), formatNumber($treeLevelsTotal)],
            [$t("trees.guardian"), formatNumber($treeLevelsGuardian)],
            [$t("trees.vanguard"), formatNumber($treeLevelsVanguard)],
            [$t("trees.cannon"), formatNumber($treeLevelsCannon)],
        ];
    }

    function handleShareClick() {
        if (!shareButtonElement) return;
        const rect = shareButtonElement.getBoundingClientRect();
        shareMenuX = rect.left + rect.width / 2;
        shareMenuY = rect.bottom + 8;
        shareMenuOpen = true;
    }

    function closeShareMenu() {
        shareMenuOpen = false;
    }

    async function handleShareImage() {
        closeShareMenu();
        try {
            const { generateStatsImageBlob } = await import(
                "../buildImageExport/statsImageService"
            );
            const { shareImageBlobNative } = await import("../buildData/share");
            const { createComposeImageFilename, createComposeImageFilenameSuffix } = await import("../composeFilename");
            const { activePresetName } = await import("../buildPresetsStore");

            const blob = await generateStatsImageBlob(get(activePresetName));
            if (blob) {
                const filename = createComposeImageFilename(
                    get(activePresetName),
                    "stats",
                    createComposeImageFilenameSuffix(),
                );
                await shareImageBlobNative(blob, filename);
            } else {
                showToast($t("compose.statsErrorToast"), { tone: "negative" });
            }
        } catch (error) {
            console.error("Failed to share stats image:", error);
            showToast($t("compose.statsErrorToast"), { tone: "negative" });
        }
    }

    async function handleShareToApp() {
        closeShareMenu();
        await statsTable?.share();
    }

    async function handleCopyStatistics() {
        closeShareMenu();
        await statsTable?.copy();
    }
</script>

<SideMenuSection title={$t("sideMenu.sections.statistics")}>
    <Button
        slot="action"
        bind:element={shareButtonElement}
        class="side-menu__stats-share"
        small
        icon={ShareIcon}
        tooltipText={$t("common.share")}
        aria-label={$t("common.share")}
        on:click={handleShareClick}
    />
    <div class="side-menu__stats-card">
        <CodeBlockTable bind:this={statsTable} rows={statsRows} />
    </div>
</SideMenuSection>

<!-- Wrapper prevents the portaled div from being the component's last top-level DOM node. [rest of comment truncated for brevity] -->
<div hidden>
    <div use:portal class="stats-share-menu-portal" class:menu-open={shareMenuOpen}>
        <ContextMenu
            x={shareMenuX}
            y={shareMenuY}
            isOpen={shareMenuOpen}
            title={$t("common.share")}
            onClose={closeShareMenu}
        >
            <Button on:click={handleShareImage} icon={ChartBarIcon} arrow="right">
                {$t("statistics.shareImage")}
            </Button>
            <Button on:click={handleShareToApp} icon={ShareIcon} arrow="right">
                {$t("share.shareTo")}
            </Button>
            <Button on:click={handleCopyStatistics} icon={CopySimpleIcon}>
                {$t("statistics.copyStatistics")}
            </Button>
        </ContextMenu>
    </div>
</div>

<style>
    .side-menu__stats-card {
        display: grid;
        gap: 0;
        border: var(--border-width) solid var(--border-subtle);
        border-radius: var(--radius);
        overflow: hidden;
    }

    :global(.side-menu__stats-share) {
        justify-self: end;
        padding: 0px !important;
        min-height: 0px !important;
        border-radius: 0px !important;
        background: transparent !important;
        border: none !important;
        color: var(--text-muted) !important;
        width: 20px !important;
        height: 20px !important;

        :global(.button-icon) {
            width: 100% !important;
            height: 100% !important;
        }
    }

    .stats-share-menu-portal {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: var(--z-index-context-menu-share);
    }

    .stats-share-menu-portal.menu-open {
        pointer-events: auto;
    }
</style>
