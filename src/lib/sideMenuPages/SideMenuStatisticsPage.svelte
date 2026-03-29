<script lang="ts">
    import CodeBlockTable from "../CodeBlockTable.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import {
        ShareIcon,
        CopySimpleIcon,
        DownloadSimpleIcon,
        TrendUpIcon,
        ArrowFatUpIcon,
        ImageIcon,
        TextTIcon,
        ScalesIcon,
        PencilSimpleIcon,
    } from "phosphor-svelte";
    import { TechCrystalIcon } from "../customIcons";
    import { formatNumber, formatPercent } from "svelte-whisper";
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
        activeTabs,
    } from "../techCrystalStore";
    import { skillBonuses, SKILL_DISPLAY_ORDER } from "../skillBonusStore";
    import { portal } from "../portal";
    import { t } from "svelte-whisper";
    import { showToast, dismissToast } from "../toast";
    import {
        copyImageBlobToClipboard,
        downloadImageBlob,
        shareImageBlobNative,
    } from "../buildData/share";
    import { activeBuildName } from "../buildPresetsStore";
    import {
        createComposeImageFilename,
        createComposeImageFilenameSuffix,
    } from "../composeFilename";
    import { compareState, stopCompare, swapBuilds } from "../compare/compareStore";
    import { computeCompareStats } from "../compare/compareStats";
    import type { CompareSection } from "../compare/CompareTable.svelte";
    import CompareTable from "../compare/CompareTable.svelte";
    import CompareBuildsMenu from "../compare/CompareBuildsMenu.svelte";
    import { guardianTree } from "../../config/guardianTree";
    import { vanguardTree } from "../../config/vanguardTree";
    import { cannonTree } from "../../config/cannonTree";

    let statsTable: CodeBlockTable | null = null;
    let statsRows: Array<
        [string | { text: string; icon?: any; iconWeight?: string }, string]
    > = [];

    let shareMenuOpen = false;
    let shareMenuX = 0;
    let shareMenuY = 0;
    let shareButtonElement: HTMLButtonElement | null = null;

    let childMenuType: "image" | "text" | null = null;
    let childMenuX = 0;
    let childMenuY = 0;

    const compareTabs = [
        { nodes: guardianTree },
        { nodes: vanguardTree },
        { nodes: cannonTree },
    ];

    let compareMenuOpen = false;
    let compareMenuX = 0;
    let compareMenuY = 0;
    let compareButtonElement: HTMLButtonElement | null = null;

    $: childMenuTitle =
        childMenuType === "image"
            ? $t("statistics.shareImage")
            : $t("statistics.shareText");

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
        childMenuType = null;
        shareMenuOpen = true;
    }

    function closeShareMenu() {
        shareMenuOpen = false;
        childMenuType = null;
    }

    function closeChildMenu() {
        childMenuType = null;
    }

    function openChildMenu(
        event: CustomEvent<MouseEvent> | MouseEvent,
        type: "image" | "text",
    ) {
        const mouseEvent =
            event instanceof CustomEvent ? event.detail : event;
        mouseEvent.stopPropagation();
        mouseEvent.preventDefault();
        const target =
            (mouseEvent.currentTarget as HTMLElement | null) ??
            (mouseEvent.target as HTMLElement | null)?.closest("button") ??
            null;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        childMenuX = rect.left + rect.width / 2;
        childMenuY = rect.bottom + 8;
        childMenuType = type;
    }

    async function withStatsImage(action: (blob: Blob) => Promise<void>) {
        const toastId = showToast($t("statistics.generatingImage"), {
            showSpinner: true,
            showIcon: false,
            durationMs: 30000,
        });
        try {
            const { generateStatsImageBlob } = await import(
                "../buildImageExport/statsImageGenerator"
            );
            const blob = await generateStatsImageBlob();
            dismissToast(toastId);
            if (!blob) {
                showToast($t("compose.statsErrorToast"), {
                    tone: "negative",
                });
                return;
            }
            await action(blob);
        } catch (error) {
            console.error("Failed to generate stats image:", error);
            dismissToast(toastId);
            showToast($t("compose.statsErrorToast"), { tone: "negative" });
        }
    }

    async function handleCopyImage() {
        closeShareMenu();
        await withStatsImage(async (blob) => {
            const success = await copyImageBlobToClipboard(blob);
            showToast(
                success
                    ? $t("compose.copiedToast")
                    : $t("compose.copyErrorToast"),
                { tone: success ? "positive" : "negative" },
            );
        });
    }

    async function handleDownloadImage() {
        closeShareMenu();
        await withStatsImage(async (blob) => {
            const filename = createComposeImageFilename(
                $activeBuildName,
                "stats",
                createComposeImageFilenameSuffix(),
            );
            downloadImageBlob(blob, filename);
            showToast($t("compose.downloadedToast"));
        });
    }

    async function handleShareImageToApp() {
        closeShareMenu();
        await withStatsImage(async (blob) => {
            const filename = createComposeImageFilename(
                $activeBuildName,
                "stats",
                createComposeImageFilenameSuffix(),
            );
            const result = await shareImageBlobNative(blob, filename);
            if (result === "copied") {
                showToast($t("share.fallbackCopiedToast"));
            } else if (result === "failed") {
                showToast($t("share.shareFailedToast"), {
                    tone: "negative",
                });
            }
        });
    }

    async function handleShareToApp() {
        closeShareMenu();
        await statsTable?.share();
    }

    async function handleCopyStatistics() {
        closeShareMenu();
        await statsTable?.copy();
    }

    function handleCompareClick() {
        if ($compareState.isComparing) {
            stopCompare();
            return;
        }
        if (!compareButtonElement) return;
        const rect = compareButtonElement.getBoundingClientRect();
        compareMenuX = rect.left + rect.width / 2;
        compareMenuY = rect.bottom + 8;
        compareMenuOpen = true;
    }

    function closeCompareMenu() {
        compareMenuOpen = false;
    }

    function handleSwapBuilds() {
        swapBuilds(compareTabs);
    }

    $: compareSections = (() => {
        if (!$compareState.isComparing || !$compareState.referenceBuild) return [];

        const refStats = computeCompareStats(
            $compareState.referenceBuild,
            $activeTabs,
        );

        const bonusSections: CompareSection["rows"] = [];
        for (const skillId of SKILL_DISPLAY_ORDER) {
            const activeVal = $skillBonuses.get(skillId) ?? 0;
            const refVal = refStats.skillBonuses.get(skillId) ?? 0;
            if (activeVal > 0 || refVal > 0) {
                bonusSections.push({
                    label: $t(`skills.${skillId}`),
                    activeValue: activeVal,
                    referenceValue: refVal,
                    format: "percent",
                });
            }
        }

        if (bonusSections.length === 0) {
            bonusSections.push({
                label: $t("common.none"),
                activeValue: 0,
                referenceValue: 0,
                format: "number",
            });
        }

        const sections: CompareSection[] = [
            {
                header: { text: $t("statistics.backpackBonus"), icon: TrendUpIcon },
                rows: bonusSections,
            },
            {
                header: {
                    text: $t("statistics.techCrystalsSpent"),
                    icon: TechCrystalIcon,
                    iconWeight: "fill",
                },
                rows: [
                    {
                        label: $t("statistics.total"),
                        activeValue: $techCrystalsSpent,
                        referenceValue: refStats.techCrystalsSpent,
                        format: "number",
                        invertIndicator: true,
                    },
                    {
                        label: $t("trees.guardian"),
                        activeValue: $techCrystalsSpentGuardian,
                        referenceValue: refStats.techCrystalsSpentByTree[0] ?? 0,
                        format: "number",
                        invertIndicator: true,
                    },
                    {
                        label: $t("trees.vanguard"),
                        activeValue: $techCrystalsSpentVanguard,
                        referenceValue: refStats.techCrystalsSpentByTree[1] ?? 0,
                        format: "number",
                        invertIndicator: true,
                    },
                    {
                        label: $t("trees.cannon"),
                        activeValue: $techCrystalsSpentCannon,
                        referenceValue: refStats.techCrystalsSpentByTree[2] ?? 0,
                        format: "number",
                        invertIndicator: true,
                    },
                ],
            },
            {
                header: {
                    text: $t("statistics.backpackNodeLevels"),
                    icon: ArrowFatUpIcon,
                },
                rows: [
                    {
                        label: $t("statistics.total"),
                        activeValue: $treeLevelsTotal,
                        referenceValue: refStats.treeLevelsTotal,
                        format: "number",
                    },
                    {
                        label: $t("trees.guardian"),
                        activeValue: $treeLevelsGuardian,
                        referenceValue: refStats.treeLevelsByTree[0] ?? 0,
                        format: "number",
                    },
                    {
                        label: $t("trees.vanguard"),
                        activeValue: $treeLevelsVanguard,
                        referenceValue: refStats.treeLevelsByTree[1] ?? 0,
                        format: "number",
                    },
                    {
                        label: $t("trees.cannon"),
                        activeValue: $treeLevelsCannon,
                        referenceValue: refStats.treeLevelsByTree[2] ?? 0,
                        format: "number",
                    },
                ],
            },
        ];

        return sections;
    })();
</script>

<SideMenuSection title={$t("sideMenu.sections.statistics")}>
    <div slot="action" class="side-menu__stats-actions">
        <Button
            bind:element={compareButtonElement}
            class="side-menu__stats-share {$compareState.isComparing ? 'compare-active' : ''}"
            small
            icon={ScalesIcon}
            tooltipText={$compareState.isComparing
                ? $t("compare.stopCompareTooltip")
                : $t("compare.compareTooltip")}
            aria-label={$compareState.isComparing
                ? $t("compare.stopCompareTooltip")
                : $t("compare.compareTooltip")}
            on:click={handleCompareClick}
        />
        <Button
            bind:element={shareButtonElement}
            class="side-menu__stats-share"
            small
            icon={ShareIcon}
            tooltipText={$t("common.share")}
            aria-label={$t("common.share")}
            on:click={handleShareClick}
        />
    </div>
    {#if $compareState.isComparing && $compareState.referenceBuild}
        <div class="side-menu__compare-toggle">
            <button
                class="compare-segment compare-segment--active"
                on:click={() => {}}
                disabled
            >
                <PencilSimpleIcon size={12} />
                <span class="compare-segment__label">{$activeBuildName}</span>
            </button>
            <button
                class="compare-segment compare-segment--reference"
                on:click={handleSwapBuilds}
                title={$t("compare.swapTooltip")}
            >
                <span class="compare-segment__label">{$compareState.referenceLabel}</span>
            </button>
        </div>
        <div class="side-menu__stats-card">
            <CompareTable sections={compareSections} />
        </div>
    {:else}
        <div class="side-menu__stats-card">
            <CodeBlockTable bind:this={statsTable} rows={statsRows} />
        </div>
    {/if}
</SideMenuSection>

<!-- Wrapper prevents the portaled div from being the component's last top-level DOM node.
     Svelte 5 tracks effect boundaries via nodes.start/nodes.end and traverses siblings
     between them during cleanup. The portal action moves its node to #app, breaking the
     sibling chain. If the portaled node is nodes.end, cleanup walks past the component
     boundary and removes the {#if} block anchor, causing blank content on tab switch.
     This wrapper (hidden, so nodes.end stays in the DOM) keeps the sibling chain intact. -->
<div hidden>
    <div use:portal class="stats-share-menu-portal" class:menu-open={shareMenuOpen}>
        <ContextMenu
            x={shareMenuX}
            y={shareMenuY}
            isOpen={shareMenuOpen}
            title={$t("common.share")}
            onClose={closeShareMenu}
        >
            <Button on:click={(e) => openChildMenu(e, "image")} icon={ImageIcon} arrow="right">
                {$t("statistics.shareImage")}
            </Button>
            <Button on:click={(e) => openChildMenu(e, "text")} icon={TextTIcon} arrow="right">
                {$t("statistics.shareText")}
            </Button>
        </ContextMenu>
    </div>
    {#if childMenuType}
        <div
            use:portal
            class="stats-share-menu-portal stats-child-menu"
            style="pointer-events: auto;"
        >
            <ContextMenu
                x={childMenuX}
                y={childMenuY}
                isOpen={true}
                title={childMenuTitle}
                onClose={closeChildMenu}
            >
                {#if childMenuType === "image"}
                    <Button on:click={handleCopyImage} icon={CopySimpleIcon}>
                        {$t("common.copy")}
                    </Button>
                    <Button on:click={handleDownloadImage} icon={DownloadSimpleIcon}>
                        {$t("common.download")}
                    </Button>
                    <Button on:click={handleShareImageToApp} icon={ShareIcon} arrow="right">
                        {$t("share.shareTo")}
                    </Button>
                {:else}
                    <Button on:click={handleShareToApp} icon={ShareIcon} arrow="right">
                        {$t("share.shareTo")}
                    </Button>
                    <Button on:click={handleCopyStatistics} icon={CopySimpleIcon}>
                        {$t("statistics.copyStatistics")}
                    </Button>
                {/if}
            </ContextMenu>
        </div>
    {/if}
    <CompareBuildsMenu
        x={compareMenuX}
        y={compareMenuY}
        isOpen={compareMenuOpen}
        onClose={closeCompareMenu}
    />
</div>

<style>
    .side-menu__stats-card {
        display: grid;
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    :global(.side-menu__stats-share) {
        justify-self: end;
        padding: 0 !important;
        min-height: 0 !important;
        border-radius: 0 !important;
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

    .stats-share-menu-portal.menu-open,
    .stats-share-menu-portal.stats-child-menu {
        pointer-events: auto;
    }

    .side-menu__stats-actions {
        display: flex;
        gap: var(--spacing-xs);
        justify-self: end;
    }

    :global(.side-menu__stats-share.compare-active) {
        color: var(--accent) !important;
    }

    .side-menu__compare-toggle {
        display: flex;
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .compare-segment {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) var(--spacing-md);
        font-size: var(--font-sm);
        border: none;
        cursor: pointer;
        min-height: 44px;
        background: transparent;
        color: var(--text-muted);
        font-family: inherit;
    }

    .compare-segment--active {
        background: color-mix(in srgb, var(--surface) 78%, var(--accent));
        color: var(--accent);
        cursor: default;
    }

    .compare-segment--reference {
        background: var(--surface);
    }

    .compare-segment--reference:hover {
        background: var(--surface-hover);
    }

    .compare-segment__label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 120px;
    }
</style>
