# Build Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stats-only build comparison to the statistics side menu page, letting users compare any two builds with a frozen reference and swap the active build.

**Architecture:** A dedicated `src/lib/compare/` module holds comparison state (store), reference stats computation (pure helpers), the 4-column comparison table (component), and the build picker menu (component). The statistics page conditionally renders the comparison table vs the existing CodeBlockTable. Existing components get minimal additive changes (menu items calling `startCompare`). No existing stores or core components are modified.

**Tech Stack:** Svelte 5, TypeScript, phosphor-svelte icons, svelte-whisper (i18n + formatNumber/formatPercent)

---

### Task 1: Add Locale Keys

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Add comparison locale keys to en.json**

Add a new `"compare"` top-level section to `src/locales/en.json` (add it after the `"statistics"` section):

```json
"compare": {
    "compareBuilds": "Compare Builds",
    "compareTooltip": "Compare with another build",
    "stopCompareTooltip": "Stop comparing",
    "compareWithActive": "Compare with active",
    "compareWith": "Compare with...",
    "personalPresets": "Your Builds",
    "fromCode": "From Link/Code",
    "swapTooltip": "Switch to this build",
    "editing": "Editing"
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `npm run check`
Expected: No errors related to locale keys (new keys are additive).

- [ ] **Step 3: Commit**

```bash
git add src/locales/en.json
git commit -m "feat(compare): add locale keys for build comparison"
```

---

### Task 2: Create Compare Store

**Files:**
- Create: `src/lib/compare/compareStore.ts`

- [ ] **Step 1: Create the compare store**

Create `src/lib/compare/compareStore.ts`:

```typescript
import { writable, get } from "svelte/store";
import type { BuildData } from "../buildData/encoder";
import type { Node } from "../../types/tree";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { applyBuildData } from "../buildData/applier";
import { activeBuildName } from "../buildPresetsStore";

export type CompareSource = "preset" | "preview" | "recommended";

export interface CompareState {
    isComparing: boolean;
    referenceBuild: BuildData | null;
    referenceLabel: string;
    referenceSource: CompareSource | null;
}

const initialState: CompareState = {
    isComparing: false,
    referenceBuild: null,
    referenceLabel: "",
    referenceSource: null,
};

export const compareState = writable<CompareState>(initialState);

export function startCompare(
    buildData: BuildData,
    name: string,
    source: CompareSource,
): void {
    compareState.set({
        isComparing: true,
        referenceBuild: {
            trees: buildData.trees.map((t) => [...t]),
            owned: buildData.owned,
        },
        referenceLabel: name,
        referenceSource: source,
    });
}

export function stopCompare(): void {
    compareState.set(initialState);
}

export function swapBuilds(trees: { nodes: Node[] }[]): void {
    const state = get(compareState);
    if (!state.isComparing || !state.referenceBuild) return;

    // Snapshot current active build
    const currentLevels = get(treeLevels);
    const currentOwned = get(techCrystalsOwned);
    const currentLabel = get(activeBuildName);
    const snapshot: BuildData = {
        trees: currentLevels.map((t) => [...t]),
        owned: currentOwned,
    };

    // Apply reference build as the new active build
    applyBuildData(trees, state.referenceBuild);

    // Store previous active as the new reference
    compareState.set({
        isComparing: true,
        referenceBuild: snapshot,
        referenceLabel: currentLabel,
        referenceSource: state.referenceSource,
    });
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compare/compareStore.ts
git commit -m "feat(compare): add comparison store with start/stop/swap"
```

---

### Task 3: Create Compare Stats Helpers

**Files:**
- Create: `src/lib/compare/compareStats.ts`

- [ ] **Step 1: Create the pure stats computation helpers**

Create `src/lib/compare/compareStats.ts`:

```typescript
import type { BuildData } from "../buildData/encoder";
import type { TabConfig, SkillId } from "../../types/tree";
import {
    calculateTechCrystalsSpent,
    calculateTreeTechCrystalsSpent,
} from "../techCrystalStore";
import { computeSkillBonuses } from "../skillBonusStore";
import { sumLevels } from "../treeLevelsStore";

export interface CompareStats {
    skillBonuses: Map<SkillId, number>;
    techCrystalsSpent: number;
    techCrystalsSpentByTree: number[];
    treeLevelsTotal: number;
    treeLevelsByTree: number[];
}

export function computeCompareStats(
    buildData: BuildData,
    tabs: TabConfig[],
): CompareStats {
    const skillBonuses = computeSkillBonuses(buildData.trees, tabs);

    const techCrystalsSpentByTree = buildData.trees.map((levels, i) => {
        const tab = tabs[i];
        if (!tab) return 0;
        return calculateTreeTechCrystalsSpent(levels, tab.nodes);
    });
    const techCrystalsSpent = calculateTechCrystalsSpent(
        buildData.trees,
        tabs,
    );

    const treeLevelsByTree = buildData.trees.map((levels) => sumLevels(levels));
    const treeLevelsTotal = treeLevelsByTree.reduce((a, b) => a + b, 0);

    return {
        skillBonuses,
        techCrystalsSpent,
        techCrystalsSpentByTree,
        treeLevelsTotal,
        treeLevelsByTree,
    };
}

export type Indicator = "higher" | "lower" | "equal";

/**
 * Compare two numeric values and return an indicator.
 * "higher" means activeValue > referenceValue.
 */
export function getIndicator(
    activeValue: number,
    referenceValue: number,
): Indicator {
    if (activeValue > referenceValue) return "higher";
    if (activeValue < referenceValue) return "lower";
    return "equal";
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compare/compareStats.ts
git commit -m "feat(compare): add pure compare stats helpers"
```

---

### Task 4: Create CompareTable Component

**Files:**
- Create: `src/lib/compare/CompareTable.svelte`

- [ ] **Step 1: Create the 4-column comparison table component**

Create `src/lib/compare/CompareTable.svelte`:

```svelte
<script lang="ts">
    import type { SkillId } from "../../types/tree";
    import type { Indicator } from "./compareStats";
    import { getIndicator } from "./compareStats";
    import { formatNumber, formatPercent } from "svelte-whisper";

    type SectionHeader = {
        text: string;
        icon?: any;
        iconWeight?: string;
    };

    export interface CompareRow {
        label: string;
        activeValue: number;
        referenceValue: number;
        format: "number" | "percent";
        /** If true, higher active value is negative (e.g. TC spent) */
        invertIndicator?: boolean;
    }

    export interface CompareSection {
        header: SectionHeader;
        rows: CompareRow[];
    }

    export let sections: CompareSection[] = [];
</script>

<table class="compare-table">
    {#each sections as section}
        <tr class="compare-table__header">
            <td colspan="4">
                {#if section.header.icon}
                    <svelte:component
                        this={section.header.icon}
                        weight={section.header.iconWeight ?? "regular"}
                        size={16}
                    />
                {/if}
                {section.header.text}
            </td>
        </tr>
        {#each section.rows as row}
            {@const indicator = getIndicator(row.activeValue, row.referenceValue)}
            {@const indicatorInverted = row.invertIndicator
                ? indicator === "higher"
                    ? "lower"
                    : indicator === "lower"
                      ? "higher"
                      : "equal"
                : indicator}
            <tr class="compare-table__row">
                <td class="compare-table__label">{row.label}</td>
                <td
                    class="compare-table__indicator"
                    class:indicator-higher={indicatorInverted === "higher"}
                    class:indicator-lower={indicatorInverted === "lower"}
                    class:indicator-equal={indicatorInverted === "equal"}
                >
                    {#if indicator === "higher"}▲{:else if indicator === "lower"}▼{:else}•{/if}
                </td>
                <td class="compare-table__active">
                    {row.format === "percent"
                        ? formatPercent(row.activeValue)
                        : formatNumber(row.activeValue)}
                </td>
                <td class="compare-table__reference">
                    {row.format === "percent"
                        ? formatPercent(row.referenceValue)
                        : formatNumber(row.referenceValue)}
                </td>
            </tr>
        {/each}
    {/each}
</table>

<style>
    .compare-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-sm);
        font-family: var(--font-mono);
    }

    .compare-table__header td {
        padding: var(--spacing-xs) var(--spacing-sm);
        color: var(--text-muted);
        font-weight: 600;
        border-bottom: var(--border-width) solid var(--border);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    }

    .compare-table__row td {
        padding: var(--spacing-xs) var(--spacing-sm);
    }

    .compare-table__label {
        color: var(--text);
    }

    .compare-table__indicator {
        width: 16px;
        text-align: center;
        font-size: var(--font-xs);
    }

    .indicator-higher {
        color: var(--positive);
    }

    .indicator-lower {
        color: var(--negative);
    }

    .indicator-equal {
        color: var(--text-disabled);
    }

    .compare-table__active {
        text-align: right;
        color: var(--accent);
    }

    .compare-table__reference {
        text-align: right;
        color: var(--text-muted);
        opacity: 0.6;
    }
</style>
```

- [ ] **Step 2: Verify the component compiles**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compare/CompareTable.svelte
git commit -m "feat(compare): add CompareTable 4-column component"
```

---

### Task 5: Create CompareBuildsMenu Component

**Files:**
- Create: `src/lib/compare/CompareBuildsMenu.svelte`

- [ ] **Step 1: Create the build picker context menu**

Create `src/lib/compare/CompareBuildsMenu.svelte`:

```svelte
<script lang="ts">
    import { LinkIcon, ScalesIcon, ShareNetworkIcon } from "phosphor-svelte";
    import type { Component } from "svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import { buildPresetsStore } from "../buildPresetsStore";
    import { decodeBuildData } from "../buildData/encoder";
    import { parseEncodedFromUserInput } from "../buildData/url";
    import { recommendedBuilds } from "../buildData/recommended";
    import {
        calculateTechCrystalsSpent,
        activeTabs,
    } from "../techCrystalStore";
    import { showToast } from "../toast";
    import { openModal } from "../modalStore";
    import { t, tr } from "svelte-whisper";
    import { TechCrystalIcon, getRecommendedBuildIcon } from "../customIcons";
    import { getDisplayPresetName } from "../i18n";
    import { truncateText } from "../stringUtil";
    import { startCompare } from "./compareStore";

    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;

    $: presets = $buildPresetsStore.presets
        .filter((p) => p.id !== $buildPresetsStore.active)
        .map((p) => ({
            id: p.id,
            name: getDisplayPresetName(p.name),
            buildCode: p.buildCode,
        }));

    $: premadeBuilds = recommendedBuilds.map((build) => {
        const localizedName = $t(build.i18nKey) || build.displayName;
        const buildData = decodeBuildData(build.encoded);
        const tcSpent = buildData
            ? calculateTechCrystalsSpent(buildData.trees, $activeTabs)
            : 0;
        return {
            name: localizedName,
            icon: getRecommendedBuildIcon(build.iconName),
            code: build.encoded,
            index: build.index,
            tcSpent,
        };
    });

    function handlePresetClick(buildCode: string, name: string) {
        const buildData = decodeBuildData(buildCode);
        if (!buildData) {
            showToast($t("preview.invalidBuildDataToast"), {
                tone: "negative",
            });
            return;
        }
        startCompare(buildData, name, "preset");
        onClose?.();
    }

    function handleRecommendedClick(buildCode: string, name: string) {
        const buildData = decodeBuildData(buildCode);
        if (!buildData) {
            showToast($t("preview.invalidBuildDataToast"), {
                tone: "negative",
            });
            return;
        }
        startCompare(buildData, name, "recommended");
        onClose?.();
    }

    function handleLoadFromCode() {
        onClose?.();
        // Open a text input modal (not LoadBuildModal which navigates away).
        // Reuse the same decode logic: parseEncodedFromUserInput + decodeBuildData.
        openModal({
            type: "textInput",
            title: tr("compare.compareBuilds"),
            titleIcon: ScalesIcon as unknown as Component,
            message: tr("preview.loadModalMessage"),
            textInput: {
                label: tr("modal.loadBuild.inputLabel"),
                value: "",
                placeholder: tr("modal.loadBuild.placeholder"),
            },
            confirmLabel: tr("compare.compareBuilds"),
            cancelLabel: tr("common.cancel"),
            onConfirm: (value) => {
                if (typeof value !== "string") return;
                const raw = value.trim();
                if (!raw) return;
                const encoded = parseEncodedFromUserInput(raw);
                if (!encoded) {
                    showToast(tr("modal.loadBuild.invalidLinkOrDataToast"), {
                        tone: "negative",
                    });
                    return;
                }
                const buildData = decodeBuildData(encoded);
                if (!buildData) {
                    showToast(tr("preview.invalidBuildDataToast"), {
                        tone: "negative",
                    });
                    return;
                }
                startCompare(
                    buildData,
                    buildData.name ?? "Build",
                    "preview",
                );
            },
        });
    }
</script>

<div use:portal class="compare-menu-portal" class:menu-open={isOpen}>
    <ContextMenu
        {x}
        {y}
        {isOpen}
        title={$t("compare.compareBuilds")}
        onClose={() => onClose?.()}
        anchorBelow
    >
        <Button
            icon={LinkIcon}
            on:click={handleLoadFromCode}
            arrow="right"
        >
            {$t("compare.fromCode")}
        </Button>

        {#if premadeBuilds.length > 0}
            <div class="section-title">{$t("preview.recommended")}</div>
            <div class="compare-builds-list">
                {#each premadeBuilds as build}
                    <Button
                        icon={build.icon ?? ShareNetworkIcon}
                        description={build.tcSpent > 0
                            ? $t("preview.techCrystalsDescription", {
                                  count: build.tcSpent.toLocaleString(),
                              })
                            : undefined}
                        descriptionIcon={build.tcSpent > 0
                            ? TechCrystalIcon
                            : null}
                        on:click={() =>
                            handleRecommendedClick(build.code, build.name)}
                    >
                        {build.index}. {build.name}
                    </Button>
                {/each}
            </div>
        {/if}

        {#if presets.length > 0}
            <div class="section-title">{$t("compare.personalPresets")}</div>
            <div class="compare-builds-list">
                {#each presets as preset}
                    <Button
                        on:click={() =>
                            handlePresetClick(preset.buildCode, preset.name)}
                    >
                        {truncateText(preset.name)}
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
        max-height: min(300px, 30vh);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
</style>
```

- [ ] **Step 2: Verify the component compiles**

Run: `npm run check`
Expected: No type errors. Note: `openLoadBuildModal` callback signature may need verification — see step 3.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compare/CompareBuildsMenu.svelte
git commit -m "feat(compare): add CompareBuildsMenu build picker"
```

---

### Task 6: Integrate Comparison into Statistics Page

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte`

This is the largest task — it wires together the compare store, stats helpers, CompareTable, CompareBuildsMenu, and the segmented toggle.

- [ ] **Step 1: Add compare imports**

Add these imports to the `<script>` section of `SideMenuStatisticsPage.svelte`, after the existing imports:

```typescript
import { ScalesIcon, PencilSimpleIcon } from "phosphor-svelte";
import { compareState, stopCompare, swapBuilds } from "../compare/compareStore";
import { computeCompareStats } from "../compare/compareStats";
import type { CompareSection } from "../compare/CompareTable.svelte";
import CompareTable from "../compare/CompareTable.svelte";
import CompareBuildsMenu from "../compare/CompareBuildsMenu.svelte";
import { activeTabs } from "../techCrystalStore";
import { activeBuildName } from "../buildPresetsStore";
import { guardianTree } from "../../config/guardianTree";
import { vanguardTree } from "../../config/vanguardTree";
import { cannonTree } from "../../config/cannonTree";
```

Note: `ScalesIcon` needs to be added to the existing phosphor-svelte import. `PencilSimpleIcon` may also already be imported — check and merge into the existing import line.

- [ ] **Step 2: Add compare state variables**

Add after the existing `let` declarations:

```typescript
const compareTabs = [
    { nodes: guardianTree },
    { nodes: vanguardTree },
    { nodes: cannonTree },
];

let compareMenuOpen = false;
let compareMenuX = 0;
let compareMenuY = 0;
let compareButtonElement: HTMLButtonElement | null = null;
```

- [ ] **Step 3: Add compare menu handlers**

Add after the existing handler functions:

```typescript
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
```

- [ ] **Step 4: Add reactive compare sections**

Add a reactive block that builds the CompareTable sections when comparing:

```typescript
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
```

- [ ] **Step 5: Update the template — add compare button to header**

In the template, find the existing `<Button>` with `slot="action"` (the share button) and wrap it in a container with the compare button:

Replace:
```svelte
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
```

With:
```svelte
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
```

- [ ] **Step 6: Update the template — add segmented toggle and comparison table**

Replace the stats card div:

```svelte
<div class="side-menu__stats-card">
    <CodeBlockTable bind:this={statsTable} rows={statsRows} />
</div>
```

With:
```svelte
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
```

- [ ] **Step 7: Add the CompareBuildsMenu to the portal section**

Inside the `<div hidden>` wrapper, after the existing share menu portals, add:

```svelte
<div use:portal class="compare-menu-portal-wrapper" class:menu-open={compareMenuOpen}>
    <CompareBuildsMenu
        x={compareMenuX}
        y={compareMenuY}
        isOpen={compareMenuOpen}
        onClose={closeCompareMenu}
    />
</div>
```

Note: `CompareBuildsMenu` already handles its own portal internally, so this outer wrapper may not be needed. Check if `CompareBuildsMenu` renders its own portal div — if so, just render `<CompareBuildsMenu>` directly without the wrapper.

- [ ] **Step 8: Add styles for the new elements**

Add to the `<style>` section:

```css
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
```

- [ ] **Step 9: Verify the full page compiles and renders**

Run: `npm run check`
Expected: No type errors.

Run: `npm run dev` and open the app. Navigate to the Statistics tab. Verify:
1. Compare icon (scales) appears next to the share icon
2. Clicking it opens the CompareBuildsMenu
3. Selecting a build shows the segmented toggle and CompareTable
4. Clicking the reference segment swaps builds
5. Clicking the compare icon again exits comparison mode

- [ ] **Step 10: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuStatisticsPage.svelte
git commit -m "feat(compare): integrate comparison UI into statistics page"
```

---

### Task 7: Add "Compare with Active" to Build Preset Menu

**Files:**
- Modify: `src/lib/buttons/BuildPresetsButton.svelte`

- [ ] **Step 1: Add compare import and handler**

Add to the imports in `BuildPresetsButton.svelte`:

```typescript
import { ScalesIcon } from "phosphor-svelte";
import { startCompare } from "../compare/compareStore";
```

Add a handler function:

```typescript
function handleCompareWithActive(presetId: string) {
    const data = get(buildPresetsStore);
    const preset = data.presets.find((p) => p.id === presetId);
    if (!preset) return;
    const buildData = decodeBuildData(preset.buildCode);
    if (!buildData) return;
    startCompare(buildData, getDisplayPresetName(preset.name), "preset");
    closeEditMenu();
    closePresetsMenu();
}
```

- [ ] **Step 2: Add the menu item to the edit submenu**

In the edit submenu (inside the `{#if editMenuPresetId}` block), add a compare button after `CloneBuildButton` and before the delete button. Only show it if the preset is not the active one:

```svelte
{#if editMenuPresetId !== $buildPresetsStore.active}
    <Button
        on:click={() => handleCompareWithActive(editMenuPresetId!)}
        tooltipText={$t("compare.compareWithActive")}
        icon={ScalesIcon}
    >
        {$t("compare.compareWithActive")}
    </Button>
{/if}
```

- [ ] **Step 3: Verify it compiles and works**

Run: `npm run check`
Expected: No type errors.

Run: `npm run dev`, open the presets menu, click the three-dots on a non-active preset. Verify "Compare with active" appears and works.

- [ ] **Step 4: Commit**

```bash
git add src/lib/buttons/BuildPresetsButton.svelte
git commit -m "feat(compare): add compare action to preset edit menu"
```

---

### Task 8: Add "Compare with..." to Preview Context Menu

**Files:**
- Modify: `src/lib/PreviewContextMenuList.svelte`

- [ ] **Step 1: Add compare import and state**

Add imports:

```typescript
import { ScalesIcon } from "phosphor-svelte";
import CompareBuildsMenu from "./compare/CompareBuildsMenu.svelte";
```

Add state:

```typescript
let compareMenuOpen = false;
let compareMenuX = 0;
let compareMenuY = 0;
let compareButtonElement: HTMLButtonElement | null = null;

function handleCompareClick(event: CustomEvent<MouseEvent> | MouseEvent) {
    const mouseEvent = event instanceof CustomEvent ? event.detail : event;
    const target = mouseEvent.currentTarget as HTMLElement | null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    compareMenuX = rect.left + rect.width / 2;
    compareMenuY = rect.bottom + 8;
    compareMenuOpen = true;
}

function closeCompareMenu() {
    compareMenuOpen = false;
}
```

- [ ] **Step 2: Add the compare button and menu to the template**

Add after the `CloneBuildButton` and before the stop preview button:

```svelte
<Button
    bind:element={compareButtonElement}
    on:click={handleCompareClick}
    icon={ScalesIcon}
    arrow="right"
>
    {$t("compare.compareWith")}
</Button>
<CompareBuildsMenu
    x={compareMenuX}
    y={compareMenuY}
    isOpen={compareMenuOpen}
    onClose={closeCompareMenu}
/>
```

- [ ] **Step 3: Verify and commit**

Run: `npm run check`
Expected: No type errors.

```bash
git add src/lib/PreviewContextMenuList.svelte
git commit -m "feat(compare): add compare action to preview context menu"
```

---

### Task 9: Add "Compare with Active" to Recommended Builds Dropdown

**Files:**
- Modify: `src/lib/buttons/PreviewBuildsDropdown.svelte`

- [ ] **Step 1: Add compare import and handler**

Add imports:

```typescript
import { ScalesIcon } from "phosphor-svelte";
import { startCompare } from "../compare/compareStore";
```

Add handler:

```typescript
function handleCompareRecommended(buildCode: string, name: string) {
    const buildData = decodeBuildData(buildCode);
    if (!buildData) {
        showToast($t("preview.invalidBuildDataToast"), { tone: "negative" });
        return;
    }
    startCompare(buildData, name, "recommended");
    onClose?.();
}
```

- [ ] **Step 2: Add compare button to each recommended build**

This is trickier because each recommended build currently renders a single `<Button>`. The simplest approach: add a small compare icon button next to each recommended build using `ButtonGroup`, or add a secondary action. Check the existing pattern — if ButtonGroup is used elsewhere for this kind of thing, follow that pattern.

A lightweight approach: add a `ScalesIcon` button next to each build in a flex row:

Wrap each build button in a `ButtonGroup`:

```svelte
{#each premadeBuilds as build}
    <ButtonGroup>
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
            tooltipText={$t("compare.compareWithActive")}
            icon={ScalesIcon}
            on:click={() =>
                handleCompareRecommended(build.code, build.name)}
        />
    </ButtonGroup>
{/each}
```

Add `ButtonGroup` import if not already present:

```typescript
import ButtonGroup from "../ButtonGroup.svelte";
```

- [ ] **Step 3: Verify and commit**

Run: `npm run check`
Expected: No type errors.

```bash
git add src/lib/buttons/PreviewBuildsDropdown.svelte
git commit -m "feat(compare): add compare action to recommended builds dropdown"
```

---

### Task 10: Auto-Exit Comparison on Build Switch

**Files:**
- Modify: `src/lib/buttons/BuildPresetsButton.svelte`

- [ ] **Step 1: Call stopCompare when switching presets**

In `BuildPresetsButton.svelte`, import `stopCompare` (add to existing compare import):

```typescript
import { startCompare, stopCompare } from "../compare/compareStore";
```

In the `switchToPreset` function, add `stopCompare()` at the beginning:

```typescript
function switchToPreset(presetId: string) {
    stopCompare();
    const data = get(buildPresetsStore);
    // ... rest unchanged
}
```

Also add `stopCompare()` at the beginning of `handleDelete` when the deleted preset was active and a new one is loaded, and in `handleAddBuild` when switching to a new build.

- [ ] **Step 2: Verify and commit**

Run: `npm run check`
Expected: No type errors.

```bash
git add src/lib/buttons/BuildPresetsButton.svelte
git commit -m "feat(compare): auto-exit comparison on preset switch"
```

---

### Task 11: Final Integration Test

**Files:** None (manual testing)

- [ ] **Step 1: Run full type check**

Run: `npm run check`
Expected: All checks pass.

- [ ] **Step 2: Run test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Manual testing checklist**

Run: `npm run dev` and test each scenario:

1. **Statistics page default** — single-build stats, no compare UI changes
2. **Enter comparison from stats header** — click scales icon, pick a preset, see comparison view
3. **Segmented toggle** — active build on left, reference on right, tapping reference swaps builds
4. **Indicators** — ▲ green when active is higher (bonuses/levels), ▲ red for TC spent, • gray for equal
5. **Exit comparison** — click scales icon again, returns to single-build view
6. **Enter from preset menu** — three-dots → "Compare with active" on a non-active preset
7. **Enter from preview context menu** — "Compare with..." opens build picker
8. **Enter from recommended builds** — scales icon next to each recommended build
9. **Auto-exit** — switch presets while comparing, comparison should stop
10. **Swap then edit** — swap active build, edit tree nodes, active column updates live
11. **Mobile** — test on narrow viewport, verify segmented toggle and table fit

- [ ] **Step 4: Commit any fixes**

If manual testing reveals issues, fix and commit each fix separately.
