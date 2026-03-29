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
        XIcon,
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
    import { animationsDisabled } from "../reduceMotionStore";
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

    let compareMenuOpen = false;
    let compareMenuX = 0;
    let compareMenuY = 0;
    let compareButtonElement: HTMLButtonElement | null = null;

    $: childMenuTitle =
        childMenuType === "image"
            ? $t("statistics.shareImage")
            : $t("statistics.shareText");

    $: sectionTitle = $compareState.isComparing
        ? $t("compare.compareStatistics")
        : $t("sideMenu.sections.statistics");

    let statsBodyEl: HTMLElement | null = null;
    let mounted = false;
    let prevCompareKey = "";

    function animateContentChange() {
        if ($animationsDisabled || !statsBodyEl) return;
        // Instantly hide: disable transition, set opacity 0
        statsBodyEl.style.transition = "none";
        statsBodyEl.style.opacity = "0";
        // Force browser to commit opacity:0 before re-enabling transition
        void statsBodyEl.offsetHeight;
        // Re-enable CSS transition and fade in
        statsBodyEl.style.removeProperty("transition");
        statsBodyEl.style.opacity = "1";
    }

    $: {
        const key = $compareState.isComparing
            ? `c:${$compareState.buildB?.label ?? ""}`
            : "idle";
        if (mounted && key !== prevCompareKey) {
            animateContentChange();
        }
        prevCompareKey = key;
        mounted = true;
    }

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
        swapBuilds($activeTabs);
    }

    $: compareSections = (() => {
        const state = $compareState;
        if (!state.isComparing || !state.buildA || !state.buildB) return [];

        // Compute stats for the non-active (frozen) side
        const frozenData =
            state.activeSide === "a" ? state.buildB.data : state.buildA.data;
        const frozenStats = computeCompareStats(frozenData, $activeTabs);

        // Live values come from stores, frozen from computed stats
        const liveSkills = $skillBonuses;
        const liveTcSpent = $techCrystalsSpent;
        const liveTcGuardian = $techCrystalsSpentGuardian;
        const liveTcVanguard = $techCrystalsSpentVanguard;
        const liveTcCannon = $techCrystalsSpentCannon;
        const liveLevelsTotal = $treeLevelsTotal;
        const liveLevelsGuardian = $treeLevelsGuardian;
        const liveLevelsVanguard = $treeLevelsVanguard;
        const liveLevelsCannon = $treeLevelsCannon;

        // Helper: assign to fixed A/B columns
        const val = (live: number, frozen: number) =>
            state.activeSide === "a"
                ? { valueA: live, valueB: frozen }
                : { valueA: frozen, valueB: live };

        const bonusRows: CompareSection["rows"] = [];
        for (const skillId of SKILL_DISPLAY_ORDER) {
            const liveVal = liveSkills.get(skillId) ?? 0;
            const frozenVal = frozenStats.skillBonuses.get(skillId) ?? 0;
            if (liveVal > 0 || frozenVal > 0) {
                bonusRows.push({
                    label: $t(`skills.${skillId}`),
                    ...val(liveVal, frozenVal),
                    format: "percent",
                });
            }
        }

        if (bonusRows.length === 0) {
            bonusRows.push({
                label: $t("common.none"),
                valueA: 0,
                valueB: 0,
                format: "number",
            });
        }

        const sections: CompareSection[] = [
            {
                header: {
                    text: $t("statistics.backpackBonus"),
                    icon: TrendUpIcon,
                },
                rows: bonusRows,
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
                        ...val(liveTcSpent, frozenStats.techCrystalsSpent),
                        format: "number",

                    },
                    {
                        label: $t("trees.guardian"),
                        ...val(
                            liveTcGuardian,
                            frozenStats.techCrystalsSpentByTree[0] ?? 0,
                        ),
                        format: "number",

                    },
                    {
                        label: $t("trees.vanguard"),
                        ...val(
                            liveTcVanguard,
                            frozenStats.techCrystalsSpentByTree[1] ?? 0,
                        ),
                        format: "number",

                    },
                    {
                        label: $t("trees.cannon"),
                        ...val(
                            liveTcCannon,
                            frozenStats.techCrystalsSpentByTree[2] ?? 0,
                        ),
                        format: "number",

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
                        ...val(liveLevelsTotal, frozenStats.treeLevelsTotal),
                        format: "number",
                    },
                    {
                        label: $t("trees.guardian"),
                        ...val(
                            liveLevelsGuardian,
                            frozenStats.treeLevelsByTree[0] ?? 0,
                        ),
                        format: "number",
                    },
                    {
                        label: $t("trees.vanguard"),
                        ...val(
                            liveLevelsVanguard,
                            frozenStats.treeLevelsByTree[1] ?? 0,
                        ),
                        format: "number",
                    },
                    {
                        label: $t("trees.cannon"),
                        ...val(
                            liveLevelsCannon,
                            frozenStats.treeLevelsByTree[2] ?? 0,
                        ),
                        format: "number",
                    },
                ],
            },
        ];

        return sections;
    })();
</script>

<SideMenuSection title={sectionTitle}>
    <div slot="action" class="side-menu__stats-actions">
        <Button
            bind:element={compareButtonElement}
            class="side-menu__stats-share {$compareState.isComparing ? 'compare-active' : ''}"
            small
            icon={ScalesIcon}
            tooltipText={$t("compare.compareTooltip")}
            aria-label={$t("compare.compareTooltip")}
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
    <div class="side-menu__stats-body" bind:this={statsBodyEl}>
        {#if $compareState.isComparing && $compareState.buildA && $compareState.buildB}
            <div class="side-menu__compare-toggle">
                <button
                    class="compare-segment"
                    class:compare-segment--active={$compareState.activeSide === "a"}
                    class:compare-segment--reference={$compareState.activeSide !== "a"}
                    on:click={$compareState.activeSide !== "a" ? handleSwapBuilds : undefined}
                    disabled={$compareState.activeSide === "a"}
                    title={$compareState.activeSide === "a"
                        ? $t("compare.editing")
                        : $t("compare.swapTooltip")}
                >
                    {#if $compareState.activeSide === "a"}
                        <PencilSimpleIcon size={12} />
                    {/if}
                    <span class="compare-segment__label"
                        >{$compareState.buildA.label}</span
                    >
                </button>
                <button
                    class="compare-segment"
                    class:compare-segment--active={$compareState.activeSide === "b"}
                    class:compare-segment--reference={$compareState.activeSide !== "b"}
                    on:click={$compareState.activeSide !== "b" ? handleSwapBuilds : undefined}
                    disabled={$compareState.activeSide === "b"}
                    title={$compareState.activeSide === "b"
                        ? $t("compare.editing")
                        : $t("compare.swapTooltip")}
                >
                    {#if $compareState.activeSide === "b"}
                        <PencilSimpleIcon size={12} />
                    {/if}
                    <span class="compare-segment__label"
                        >{$compareState.buildB.label}</span
                    >
                </button>
                <button
                    class="compare-stop"
                    on:click={() => stopCompare()}
                    title={$t("compare.stopCompareTooltip")}
                >
                    <XIcon size={18} />
                </button>
            </div>
            <div class="side-menu__stats-card">
                <CompareTable
                    sections={compareSections}
                    activeSide={$compareState.activeSide}
                    labelA={$compareState.buildA.label}
                    labelB={$compareState.buildB.label}
                />
            </div>
        {:else}
            <div class="side-menu__stats-card">
                <CodeBlockTable bind:this={statsTable} rows={statsRows} />
            </div>
        {/if}
    </div>
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
            anchorBelow
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
                anchorBelow
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
        align-items: center;
        justify-self: end;
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
        padding: var(--spacing-xs) var(--spacing-md);
        font-size: var(--font-sm);
        border: none;
        cursor: pointer;
        min-height: 32px;
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

    :global(.side-menu__stats-share.compare-active) {
        color: var(--accent) !important;
    }

    .compare-segment--reference:active {
        filter: var(--brightness-hover);
    }

    .compare-segment--reference:active .compare-segment__label {
        transform: scale(0.96);
    }

    .compare-stop {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        border: none;
        border-left: var(--border-width) solid var(--danger-border);
        background: var(--danger-bg);
        color: var(--danger-text);
        cursor: pointer;
        font-family: inherit;
    }

    .compare-stop:active {
        filter: var(--brightness-hover);
    }

    .compare-stop:active :global(svg) {
        transform: scale(0.85);
    }

    .side-menu__stats-body {
        display: grid;
        gap: var(--spacing-md);
        transition: opacity var(--ease);
    }
</style>
