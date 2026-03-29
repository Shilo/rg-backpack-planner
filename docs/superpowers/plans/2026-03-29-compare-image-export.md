# Compare Image Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When compare mode is active, the "Share Image" action in the Statistics page exports a compare card showing both build names, a diff pill per row, and color-coded values instead of the normal single-build stats card.

**Architecture:** Extract `CompareSection`/`CompareRow` types from `CompareTable.svelte` into `compareStats.ts` (enables `.ts`-only imports), add `buildCompareSections()` to eliminate duplication, then add a new `compareImageRenderer.ts` (pure canvas) and `compareImageGenerator.ts` (store reads + orchestration). `withStatsImage()` in `SideMenuStatisticsPage` gets a one-line branch to call the compare generator when comparing.

**Tech Stack:** TypeScript, Svelte 5, `node:assert` tests, HTML Canvas API, `svelte-whisper` formatters.

---

## File Map

| File | Change |
|------|--------|
| `src/lib/compare/compareStats.ts` | Add `CompareRow`, `CompareSection` exports + `buildCompareSections()` |
| `src/lib/compare/CompareTable.svelte` | Import `CompareRow`/`CompareSection` from `compareStats.ts` instead of defining inline |
| `src/lib/compare/compareImageRenderer.ts` | **New** — pure canvas `renderCompareImage()` |
| `src/lib/compare/compareImageGenerator.ts` | **New** — store reads + calls renderer |
| `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte` | Use `buildCompareSections()`, branch `withStatsImage()` |
| `test/compareStats.test.ts` | **New** — `buildCompareSections()` activeSide assignment tests |
| `test/index.ts` | Register `compareStats.test.ts` |

---

### Task 1: Move CompareSection/CompareRow types to compareStats.ts

**Files:**
- Modify: `src/lib/compare/compareStats.ts`
- Modify: `src/lib/compare/CompareTable.svelte`
- Modify: `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte`

- [ ] **Step 1: Add type exports to `compareStats.ts`**

Add after the last import in `src/lib/compare/compareStats.ts`:

```typescript
export interface CompareRow {
    label: string;
    valueA: number;
    valueB: number;
    format: "number" | "percent";
}

export interface CompareSection {
    header: {
        text: string;
        icon?: any;
        iconWeight?: string;
    };
    rows: CompareRow[];
}
```

- [ ] **Step 2: Update `CompareTable.svelte` to import types from `compareStats.ts`**

In `src/lib/compare/CompareTable.svelte`, replace the entire `<script lang="ts" context="module">` block:

```svelte
<script lang="ts" context="module">
    export type { CompareRow, CompareSection } from "./compareStats";
</script>
```

Then in the main `<script lang="ts">` block, update the first import line from:

```typescript
    import { getIndicator } from "./compareStats";
```

to:

```typescript
    import { getIndicator, type CompareSection } from "./compareStats";
```

- [ ] **Step 3: Update `SideMenuStatisticsPage.svelte` import**

In `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte`, change:

```typescript
import type { CompareSection } from "../compare/CompareTable.svelte";
```

to:

```typescript
import type { CompareSection } from "../compare/compareStats";
```

- [ ] **Step 4: Run type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/compare/compareStats.ts src/lib/compare/CompareTable.svelte src/lib/sideMenuPages/SideMenuStatisticsPage.svelte
git commit -m "refactor(compare): move CompareSection/CompareRow types to compareStats.ts"
```

---

### Task 2: Add buildCompareSections() with tests (TDD)

**Files:**
- Test: `test/compareStats.test.ts`
- Modify: `test/index.ts`
- Modify: `src/lib/compare/compareStats.ts`

- [ ] **Step 1: Write the failing test**

Create `test/compareStats.test.ts`:

```typescript
import assert from "node:assert";
import { buildCompareSections } from "../src/lib/compare/compareStats.ts";
import type { CompareState } from "../src/lib/compare/compareStore.ts";
import type { TabConfig } from "../src/types/tree.ts";

const emptyTabs: TabConfig[] = [
    { id: "guardian", label: "Guardian", nodes: [] },
    { id: "vanguard", label: "Vanguard", nodes: [] },
    { id: "cannon", label: "Cannon", nodes: [] },
];

const buildA = {
    data: { trees: [[], [], []], owned: 0 },
    label: "Build A",
    source: { type: "preset" as const, id: "a" },
};
const buildB = {
    data: { trees: [[], [], []], owned: 0 },
    label: "Build B",
    source: { type: "preset" as const, id: "b" },
};

// activeSide "a": live values → valueA, frozen → valueB
{
    const state: CompareState = {
        isComparing: true,
        activeSide: "a",
        buildA,
        buildB,
    };
    const live = {
        skillBonuses: new Map(),
        techCrystalsSpent: 100,
        techCrystalsSpentByTree: [40, 35, 25],
        treeLevelsTotal: 50,
        treeLevelsByTree: [20, 20, 10],
    };
    const sections = buildCompareSections(state, emptyTabs, live, (k) => k);
    // Section 1 = TC Spent, row 0 = total
    const totalRow = sections[1].rows[0];
    assert.strictEqual(totalRow.valueA, 100, "activeSide a: live TC → valueA");
    assert.strictEqual(totalRow.valueB, 0, "activeSide a: frozen TC → valueB");
    // Section 2 = node levels, row 0 = total
    const levelsRow = sections[2].rows[0];
    assert.strictEqual(levelsRow.valueA, 50, "activeSide a: live levels → valueA");
    assert.strictEqual(levelsRow.valueB, 0, "activeSide a: frozen levels → valueB");
}

// activeSide "b": live values → valueB, frozen → valueA
{
    const state: CompareState = {
        isComparing: true,
        activeSide: "b",
        buildA,
        buildB,
    };
    const live = {
        skillBonuses: new Map(),
        techCrystalsSpent: 100,
        techCrystalsSpentByTree: [40, 35, 25],
        treeLevelsTotal: 50,
        treeLevelsByTree: [20, 20, 10],
    };
    const sections = buildCompareSections(state, emptyTabs, live, (k) => k);
    const totalRow = sections[1].rows[0];
    assert.strictEqual(totalRow.valueA, 0, "activeSide b: frozen TC → valueA");
    assert.strictEqual(totalRow.valueB, 100, "activeSide b: live TC → valueB");
    const levelsRow = sections[2].rows[0];
    assert.strictEqual(levelsRow.valueA, 0, "activeSide b: frozen levels → valueA");
    assert.strictEqual(levelsRow.valueB, 50, "activeSide b: live levels → valueB");
}

// per-tree values are assigned correctly
{
    const state: CompareState = {
        isComparing: true,
        activeSide: "a",
        buildA,
        buildB,
    };
    const live = {
        skillBonuses: new Map(),
        techCrystalsSpent: 100,
        techCrystalsSpentByTree: [40, 35, 25],
        treeLevelsTotal: 50,
        treeLevelsByTree: [20, 20, 10],
    };
    const sections = buildCompareSections(state, emptyTabs, live, (k) => k);
    const tcSection = sections[1];
    assert.strictEqual(tcSection.rows[1].valueA, 40, "guardian TC valueA");
    assert.strictEqual(tcSection.rows[2].valueA, 35, "vanguard TC valueA");
    assert.strictEqual(tcSection.rows[3].valueA, 25, "cannon TC valueA");
}

// returns empty array when not comparing
{
    const state: CompareState = {
        isComparing: false,
        activeSide: "a",
        buildA: null,
        buildB: null,
    };
    const sections = buildCompareSections(state, emptyTabs, {
        skillBonuses: new Map(),
        techCrystalsSpent: 0,
        techCrystalsSpentByTree: [0, 0, 0],
        treeLevelsTotal: 0,
        treeLevelsByTree: [0, 0, 0],
    }, (k) => k);
    assert.deepStrictEqual(sections, []);
}
```

- [ ] **Step 2: Register test in `test/index.ts`**

In `test/index.ts`, add `"compareStats.test.ts"` to the `TEST_FILES` array under the `// 2. Core State & Logic` section (after `"skillBonusStore.test.ts"`):

```typescript
    "skillBonusStore.test.ts",
    "calculateTechCrystalsSpent.test.ts",
    "compareStats.test.ts",
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test 2>&1 | grep -A 5 "compareStats"
```

Expected: `❌ compareStats.test.ts failed` with `TypeError: buildCompareSections is not a function` or similar.

- [ ] **Step 4: Implement `buildCompareSections()` in `compareStats.ts`**

Add the following imports at the top of `src/lib/compare/compareStats.ts` (after existing imports):

```typescript
import type { CompareState } from "./compareStore";
import { SKILL_DISPLAY_ORDER } from "../skillBonusStore";
import { TrendUpIcon, ArrowFatUpIcon } from "phosphor-svelte";
import { TechCrystalIcon } from "../customIcons";
```

Then add this function at the end of the file:

```typescript
/**
 * Builds the sections array for comparison display.
 * valueA always holds buildA's stats, valueB holds buildB's stats.
 * activeSide determines which side reads from live store values vs computed snapshot.
 */
export function buildCompareSections(
    state: CompareState,
    tabs: TabConfig[],
    live: {
        skillBonuses: Map<SkillId, number>;
        techCrystalsSpent: number;
        techCrystalsSpentByTree: number[];
        treeLevelsTotal: number;
        treeLevelsByTree: number[];
    },
    translate: (key: string) => string,
): CompareSection[] {
    if (!state.isComparing || !state.buildA || !state.buildB) return [];

    const frozenData =
        state.activeSide === "a" ? state.buildB.data : state.buildA.data;
    const frozenStats = computeCompareStats(frozenData, tabs);

    const val = (liveVal: number, frozenVal: number) =>
        state.activeSide === "a"
            ? { valueA: liveVal, valueB: frozenVal }
            : { valueA: frozenVal, valueB: liveVal };

    const bonusRows: CompareSection["rows"] = [];
    for (const skillId of SKILL_DISPLAY_ORDER) {
        const liveVal = live.skillBonuses.get(skillId) ?? 0;
        const frozenVal = frozenStats.skillBonuses.get(skillId) ?? 0;
        if (liveVal > 0 || frozenVal > 0) {
            bonusRows.push({
                label: translate(`skills.${skillId}`),
                ...val(liveVal, frozenVal),
                format: "percent",
            });
        }
    }

    if (bonusRows.length === 0) {
        bonusRows.push({
            label: translate("common.none"),
            valueA: 0,
            valueB: 0,
            format: "number",
        });
    }

    return [
        {
            header: { text: translate("statistics.backpackBonus"), icon: TrendUpIcon },
            rows: bonusRows,
        },
        {
            header: {
                text: translate("statistics.techCrystalsSpent"),
                icon: TechCrystalIcon,
                iconWeight: "fill",
            },
            rows: [
                {
                    label: translate("statistics.total"),
                    ...val(live.techCrystalsSpent, frozenStats.techCrystalsSpent),
                    format: "number",
                },
                {
                    label: translate("trees.guardian"),
                    ...val(
                        live.techCrystalsSpentByTree[0] ?? 0,
                        frozenStats.techCrystalsSpentByTree[0] ?? 0,
                    ),
                    format: "number",
                },
                {
                    label: translate("trees.vanguard"),
                    ...val(
                        live.techCrystalsSpentByTree[1] ?? 0,
                        frozenStats.techCrystalsSpentByTree[1] ?? 0,
                    ),
                    format: "number",
                },
                {
                    label: translate("trees.cannon"),
                    ...val(
                        live.techCrystalsSpentByTree[2] ?? 0,
                        frozenStats.techCrystalsSpentByTree[2] ?? 0,
                    ),
                    format: "number",
                },
            ],
        },
        {
            header: {
                text: translate("statistics.backpackNodeLevels"),
                icon: ArrowFatUpIcon,
            },
            rows: [
                {
                    label: translate("statistics.total"),
                    ...val(live.treeLevelsTotal, frozenStats.treeLevelsTotal),
                    format: "number",
                },
                {
                    label: translate("trees.guardian"),
                    ...val(
                        live.treeLevelsByTree[0] ?? 0,
                        frozenStats.treeLevelsByTree[0] ?? 0,
                    ),
                    format: "number",
                },
                {
                    label: translate("trees.vanguard"),
                    ...val(
                        live.treeLevelsByTree[1] ?? 0,
                        frozenStats.treeLevelsByTree[1] ?? 0,
                    ),
                    format: "number",
                },
                {
                    label: translate("trees.cannon"),
                    ...val(
                        live.treeLevelsByTree[2] ?? 0,
                        frozenStats.treeLevelsByTree[2] ?? 0,
                    ),
                    format: "number",
                },
            ],
        },
    ];
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test 2>&1 | grep -A 3 "compareStats"
```

Expected: `✅ compareStats.test.ts passed`

- [ ] **Step 6: Run full check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/compare/compareStats.ts test/compareStats.test.ts test/index.ts
git commit -m "feat(compare): add buildCompareSections() helper with tests"
```

---

### Task 3: Refactor SideMenuStatisticsPage to use buildCompareSections()

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte`

- [ ] **Step 1: Add import**

In `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte`, the existing import:

```typescript
import { computeCompareStats } from "../compare/compareStats";
```

Change to:

```typescript
import { computeCompareStats, buildCompareSections } from "../compare/compareStats";
```

- [ ] **Step 2: Replace the inline compareSections reactive block**

Find and replace the entire `$: compareSections = (() => { ... })();` block (lines 294–432 in the current file) with:

```typescript
$: compareSections = buildCompareSections(
    $compareState,
    $activeTabs,
    {
        skillBonuses: $skillBonuses,
        techCrystalsSpent: $techCrystalsSpent,
        techCrystalsSpentByTree: [
            $techCrystalsSpentGuardian,
            $techCrystalsSpentVanguard,
            $techCrystalsSpentCannon,
        ],
        treeLevelsTotal: $treeLevelsTotal,
        treeLevelsByTree: [
            $treeLevelsGuardian,
            $treeLevelsVanguard,
            $treeLevelsCannon,
        ],
    },
    $t,
);
```

- [ ] **Step 3: Remove now-unused `computeCompareStats` import**

Remove `computeCompareStats` from the import line updated in Step 1:

```typescript
import { buildCompareSections } from "../compare/compareStats";
```

- [ ] **Step 4: Run check and verify UI still works**

```bash
npm run check
```

Expected: no errors.

Start `npm run dev`, open the app, start a comparison, verify the compare table renders identically to before.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuStatisticsPage.svelte
git commit -m "refactor(compare): use buildCompareSections() in statistics page"
```

---

### Task 4: Create compareImageRenderer.ts

**Files:**
- Create: `src/lib/compare/compareImageRenderer.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/compare/compareImageRenderer.ts`:

```typescript
import type { CompareSection } from "./compareStats";
import { getIndicator } from "./compareStats";
import { formatNumber, formatPercent } from "svelte-whisper";
import { EXPORT_DPR, EXPORT_MIME } from "../buildImageExport/imageFormat";

export type CompareImageData = {
    labelA: string;
    labelB: string;
    sections: CompareSection[];
};

const LABEL_FONT = '"Inter", "Segoe UI", system-ui, sans-serif';
const DPR = EXPORT_DPR;

const GAP = 16;
const BORDER_RADIUS = 12;
const BORDER_WIDTH = 1.5;
const ACCENT_BAR_H = 3;
const HEADER_H = 36;
const SECTION_H = 26;
const ROW_H = 26;
const PILL_H_PAD = 7;

const HEADER_NAME_SIZE = 13;
const HEADER_VS_SIZE = 11;
const SECTION_SIZE = 11;
const COL_LABEL_SIZE = 11;
const ROW_LABEL_SIZE = 12;
const VALUE_SIZE = 13;
const DIFF_SIZE = 10;

const headerNameFont = `700 ${HEADER_NAME_SIZE}px ${LABEL_FONT}`;
const headerVsFont = `400 ${HEADER_VS_SIZE}px ${LABEL_FONT}`;
const sectionFont = `700 ${SECTION_SIZE}px ${LABEL_FONT}`;
const colLabelFont = `600 ${COL_LABEL_SIZE}px ${LABEL_FONT}`;
const rowLabelFont = `500 ${ROW_LABEL_SIZE}px ${LABEL_FONT}`;
const valueFont = `700 ${VALUE_SIZE}px ${LABEL_FONT}`;
const diffFont = `600 ${DIFF_SIZE}px ${LABEL_FONT}`;

function resolveThemeColor(prop: string, fallback: string): string {
    if (typeof document === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(prop)
        .trim();
    return value || fallback;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function measureWidth(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
): number {
    ctx.font = font;
    return ctx.measureText(text).width;
}

function formatValue(value: number, format: "number" | "percent"): string {
    return format === "percent" ? formatPercent(value) : formatNumber(value);
}

function getDiffText(
    valueA: number,
    valueB: number,
    format: "number" | "percent",
): string {
    if (valueA === valueB) return "–";
    const diff = Math.abs(valueA - valueB);
    const diffStr = formatValue(diff, format);
    return valueA > valueB ? `+${diffStr} ▲` : `−${diffStr} ▼`;
}

function truncateText(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
    maxWidth: number,
): string {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s.length > 0 && ctx.measureText(s + "…").width > maxWidth) {
        s = s.slice(0, -1);
    }
    return s.length > 0 ? s + "…" : "…";
}

export async function renderCompareImage(
    data: CompareImageData,
): Promise<Blob | null> {
    const bgColor = resolveThemeColor("--node-locked-bg", "#2a2a30");
    const borderColor = resolveThemeColor("--node-locked-border", "#3e3e46");
    const textColor = resolveThemeColor("--text", "#e8e8ec");
    const mutedColor = resolveThemeColor("--text-muted", "#8a8a94");
    const accentColor = resolveThemeColor("--accent", "#5b9bd5");
    const higherColor = "#4caf50";
    const lowerColor = resolveThemeColor("--accent-danger", "#e57373");
    const dimColor = resolveThemeColor("--text-disabled", "#555560");
    const pillBg = "rgba(255,255,255,0.08)";
    const pillBorder = "rgba(255,255,255,0.12)";
    const dimPillBg = "rgba(255,255,255,0.04)";
    const dimPillBorder = "rgba(255,255,255,0.07)";

    // --- Measurement pass ---
    const mCanvas = document.createElement("canvas");
    mCanvas.width = 1;
    mCanvas.height = 1;
    const mCtx = mCanvas.getContext("2d");
    if (!mCtx) return null;

    let maxLabelW = 0;
    let maxDiffTextW = 0;
    let maxValueAW = 0;
    let maxValueBW = 0;

    for (const section of data.sections) {
        for (const row of section.rows) {
            maxLabelW = Math.max(
                maxLabelW,
                measureWidth(mCtx, row.label, rowLabelFont),
            );
            const diffText = getDiffText(row.valueA, row.valueB, row.format);
            maxDiffTextW = Math.max(
                maxDiffTextW,
                measureWidth(mCtx, diffText, diffFont),
            );
            maxValueAW = Math.max(
                maxValueAW,
                measureWidth(mCtx, formatValue(row.valueA, row.format), valueFont),
            );
            maxValueBW = Math.max(
                maxValueBW,
                measureWidth(mCtx, formatValue(row.valueB, row.format), valueFont),
            );
        }
    }

    mCanvas.width = 0;
    mCanvas.height = 0;

    const labelColW = Math.max(40, maxLabelW);
    const diffColW = Math.max(20, maxDiffTextW + PILL_H_PAD * 2);
    const valueAColW = Math.max(24, maxValueAW);
    const valueBColW = Math.max(24, maxValueBW);

    const cardWidth =
        GAP + labelColW + GAP + diffColW + GAP + valueAColW + GAP + valueBColW + GAP;

    let cardH = ACCENT_BAR_H + HEADER_H;
    for (const section of data.sections) {
        cardH += SECTION_H + section.rows.length * ROW_H;
    }
    cardH += 8;

    // --- Draw pass ---
    const canvas = document.createElement("canvas");
    canvas.width = cardWidth * DPR;
    canvas.height = cardH * DPR;
    const maybeCtx = canvas.getContext("2d", { alpha: true });
    if (!maybeCtx) return null;
    const ctx = maybeCtx;
    ctx.scale(DPR, DPR);
    ctx.textBaseline = "middle";

    // Card background + border
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 16;
    drawRoundedRect(ctx, 0, 0, cardWidth, cardH, BORDER_RADIUS);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.stroke();
    ctx.restore();

    // Accent bar
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(BORDER_RADIUS, 0);
    ctx.lineTo(cardWidth - BORDER_RADIUS, 0);
    ctx.arcTo(cardWidth, 0, cardWidth, BORDER_RADIUS, BORDER_RADIUS);
    ctx.lineTo(cardWidth, ACCENT_BAR_H);
    ctx.lineTo(0, ACCENT_BAR_H);
    ctx.lineTo(0, BORDER_RADIUS);
    ctx.arcTo(0, 0, BORDER_RADIUS, 0, BORDER_RADIUS);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, cardWidth, ACCENT_BAR_H);
    ctx.restore();

    // "vs" header
    const headerMidY = ACCENT_BAR_H + HEADER_H / 2;
    const vsText = "vs";
    const vsW = measureWidth(ctx, vsText, headerVsFont);
    const halfNameW = cardWidth / 2 - GAP - vsW / 2 - GAP;

    ctx.font = headerVsFont;
    ctx.fillStyle = dimColor;
    ctx.textAlign = "center";
    ctx.fillText(vsText, cardWidth / 2, headerMidY);

    ctx.font = headerNameFont;
    ctx.fillStyle = accentColor;
    ctx.textAlign = "left";
    ctx.fillText(
        truncateText(ctx, data.labelA, headerNameFont, halfNameW),
        GAP,
        headerMidY,
    );

    ctx.fillStyle = mutedColor;
    ctx.textAlign = "right";
    ctx.fillText(
        truncateText(ctx, data.labelB, headerNameFont, halfNameW),
        cardWidth - GAP,
        headerMidY,
    );

    // Header bottom border
    ctx.fillStyle = borderColor;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, ACCENT_BAR_H + HEADER_H - 1, cardWidth, 1);
    ctx.globalAlpha = 1;

    let y = ACCENT_BAR_H + HEADER_H;

    // Sections
    const valueARight = GAP + labelColW + GAP + diffColW + GAP + valueAColW;
    const valueBRight = cardWidth - GAP;
    const diffColCenterX = GAP + labelColW + GAP + diffColW / 2;
    const pillHeight = DIFF_SIZE * 1.8;

    for (let si = 0; si < data.sections.length; si++) {
        const section = data.sections[si];
        const isFirst = si === 0;

        // Section header background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, y, cardWidth, SECTION_H);
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, y, cardWidth, SECTION_H);
        ctx.restore();

        // Section top border
        ctx.fillStyle = borderColor;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(0, y, cardWidth, 1);
        ctx.globalAlpha = 1;

        const sectionMidY = y + SECTION_H / 2;

        ctx.font = sectionFont;
        ctx.fillStyle = mutedColor;
        ctx.textAlign = "left";
        ctx.fillText(section.header.text.toUpperCase(), GAP, sectionMidY);

        if (isFirst) {
            ctx.font = colLabelFont;
            ctx.fillStyle = accentColor;
            ctx.textAlign = "right";
            ctx.fillText(
                truncateText(ctx, data.labelA, colLabelFont, valueAColW),
                valueARight,
                sectionMidY,
            );
            ctx.fillStyle = mutedColor;
            ctx.fillText(
                truncateText(ctx, data.labelB, colLabelFont, valueBColW),
                valueBRight,
                sectionMidY,
            );
        }

        y += SECTION_H;

        // Data rows
        for (const row of section.rows) {
            // Row top border
            ctx.fillStyle = borderColor;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(0, y, cardWidth, 1);
            ctx.globalAlpha = 1;

            const rowMidY = y + ROW_H / 2;

            // Label
            ctx.font = rowLabelFont;
            ctx.fillStyle = mutedColor;
            ctx.textAlign = "left";
            ctx.fillText(row.label, GAP, rowMidY);

            // Diff pill
            const diffText = getDiffText(row.valueA, row.valueB, row.format);
            const isEqual = row.valueA === row.valueB;
            const diffTextW = measureWidth(ctx, diffText, diffFont);
            const pillW = diffTextW + PILL_H_PAD * 2;
            const pillX = diffColCenterX - pillW / 2;
            const pillTop = y + (ROW_H - pillHeight) / 2;

            ctx.save();
            drawRoundedRect(ctx, pillX, pillTop, pillW, pillHeight, pillHeight / 2);
            ctx.fillStyle = isEqual ? dimPillBg : pillBg;
            ctx.fill();
            ctx.strokeStyle = isEqual ? dimPillBorder : pillBorder;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            ctx.font = diffFont;
            ctx.fillStyle = isEqual ? dimColor : mutedColor;
            ctx.textAlign = "center";
            ctx.fillText(diffText, diffColCenterX, rowMidY);

            // Value A
            const indicator = getIndicator(row.valueA, row.valueB);
            const valueAColor =
                indicator === "higher"
                    ? higherColor
                    : indicator === "lower"
                      ? lowerColor
                      : textColor;
            ctx.font = valueFont;
            ctx.fillStyle = valueAColor;
            ctx.textAlign = "right";
            ctx.fillText(formatValue(row.valueA, row.format), valueARight, rowMidY);

            // Value B (always white)
            ctx.fillStyle = textColor;
            ctx.fillText(formatValue(row.valueB, row.format), valueBRight, rowMidY);

            y += ROW_H;
        }
    }

    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = 0;
                    canvas.height = 0;
                } catch (_) {
                    // no-op
                }
                resolve(blob);
            },
            EXPORT_MIME,
        );
    });
}
```

- [ ] **Step 2: Run type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compare/compareImageRenderer.ts
git commit -m "feat(compare): add compareImageRenderer canvas drawing"
```

---

### Task 5: Create compareImageGenerator.ts

**Files:**
- Create: `src/lib/compare/compareImageGenerator.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/compare/compareImageGenerator.ts`:

```typescript
import { get } from "svelte/store";
import { t } from "svelte-whisper";
import { compareState } from "./compareStore";
import {
    activeTabs,
    techCrystalsSpent,
    techCrystalsSpentGuardian,
    techCrystalsSpentVanguard,
    techCrystalsSpentCannon,
} from "../techCrystalStore";
import { skillBonuses } from "../skillBonusStore";
import {
    treeLevelsTotal,
    treeLevelsGuardian,
    treeLevelsVanguard,
    treeLevelsCannon,
} from "../treeLevelsStore";
import { buildCompareSections } from "./compareStats";
import { renderCompareImage } from "./compareImageRenderer";

export async function generateCompareImageBlob(): Promise<Blob | null> {
    const state = get(compareState);
    if (!state.isComparing || !state.buildA || !state.buildB) return null;

    const tabs = get(activeTabs);
    const translate = get(t);

    const sections = buildCompareSections(
        state,
        tabs,
        {
            skillBonuses: get(skillBonuses),
            techCrystalsSpent: get(techCrystalsSpent),
            techCrystalsSpentByTree: [
                get(techCrystalsSpentGuardian),
                get(techCrystalsSpentVanguard),
                get(techCrystalsSpentCannon),
            ],
            treeLevelsTotal: get(treeLevelsTotal),
            treeLevelsByTree: [
                get(treeLevelsGuardian),
                get(treeLevelsVanguard),
                get(treeLevelsCannon),
            ],
        },
        translate,
    );

    return renderCompareImage({
        labelA: state.buildA.label,
        labelB: state.buildB.label,
        sections,
    });
}
```

- [ ] **Step 2: Run type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compare/compareImageGenerator.ts
git commit -m "feat(compare): add compareImageGenerator"
```

---

### Task 6: Wire compare image into withStatsImage()

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte`

- [ ] **Step 1: Replace `withStatsImage()` function body**

In `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte`, find the `withStatsImage` function and replace it entirely:

```typescript
async function withStatsImage(action: (blob: Blob) => Promise<void>) {
    const toastId = showToast($t("statistics.generatingImage"), {
        showSpinner: true,
        showIcon: false,
        durationMs: 30000,
    });
    try {
        let blob: Blob | null;
        if ($compareState.isComparing) {
            const { generateCompareImageBlob } = await import(
                "../compare/compareImageGenerator"
            );
            blob = await generateCompareImageBlob();
        } else {
            const { generateStatsImageBlob } = await import(
                "../buildImageExport/statsImageGenerator"
            );
            blob = await generateStatsImageBlob();
        }
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
```

- [ ] **Step 2: Run type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Smoke test in browser**

Run `npm run dev`. Open the app, start a comparison between two builds with differing stats. Open Statistics → Share → Share Image → Copy. Paste into an image viewer or Discord and verify:
- "vs" header shows both build names
- Section headers are present
- Diff pills appear on each row
- Higher values are green, lower are red, equal are white
- Reference column (right) is always white

Then verify normal (non-compare) share image still works: stop compare, share image again, verify the original 2-column stats card appears.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuStatisticsPage.svelte
git commit -m "feat(compare): show compare image when sharing stats in compare mode"
```
