# Recommended Build TC Description Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display tech crystals spent per recommended build as an inline icon+number description on each button in `PreviewBuildsDropdown`.

**Architecture:** Extract the existing inline TC calculation from `techCrystalsFromActivePreset` into a named pure function `calculateTechCrystalsSpent`; add a `descriptionIcon` prop to `Button.svelte` for icon+text description rows; wire both into the dropdown's reactive build list. `techCrystalsSpentByTree` and all statistics-page stores are untouched.

**Tech Stack:** Svelte 4-style components, TypeScript, `svelte/store`, `phosphor-svelte` icons, Node.js `assert` + `tsx` test runner.

---

## File Map

| File | Change |
|------|--------|
| `src/lib/techCrystalStore.ts` | Add exported `calculateTechCrystalsSpent` pure function; refactor `techCrystalsFromActivePreset` to call it |
| `src/lib/Button.svelte` | Add `descriptionIcon: Component \| null` prop; update template and CSS |
| `src/lib/buttons/PreviewBuildsDropdown.svelte` | Import and wire TC count into `$: premadeBuilds`; pass `description` + `descriptionIcon` to each premade Button |
| `test/calculateTechCrystalsSpent.test.ts` | Unit tests for the pure helper |
| `test/previewBuildsDropdownTcDescription.test.ts` | Contract test: verifies the dropdown source wires the icon and formatted count |
| `test/index.ts` | Register both new test files |

---

## Chunk 1: Extract `calculateTechCrystalsSpent`

### Task 1: Write failing test and register it

**Files:**
- Create: `test/calculateTechCrystalsSpent.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Create the test file**

```ts
// test/calculateTechCrystalsSpent.test.ts
import assert from "node:assert";
import { calculateTechCrystalsSpent } from "../src/lib/techCrystalStore.ts";
import type { TabConfig } from "../src/types/tree.ts";

// attack_boost uses COSTS_100_STAT: costs[0]=5, costs[1]=6, costs[2]=7
const tabA: TabConfig = {
    id: "a",
    label: "A",
    nodes: [{ skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 }],
};

// final_damage_boost uses COSTS_FINAL: costs[0]=1000, maxLevel=1
const tabB: TabConfig = {
    id: "b",
    label: "B",
    nodes: [{ skillId: "final_damage_boost", maxLevel: 1, radius: 1, x: 0, y: 0 }],
};

// All zeros → 0
assert.strictEqual(
    calculateTechCrystalsSpent([[0]], [tabA]),
    0,
    "level 0 should cost 0",
);

// Level 1 at node 0 → costs[0] = 5
assert.strictEqual(
    calculateTechCrystalsSpent([[1]], [tabA]),
    5,
    "attack_boost level 1 should cost 5",
);

// Level 2 at node 0 → costs[0] + costs[1] = 5 + 6 = 11
assert.strictEqual(
    calculateTechCrystalsSpent([[2]], [tabA]),
    11,
    "attack_boost level 2 should cost 11",
);

// Two trees: attack_boost level 1 + final_damage_boost level 1 = 5 + 1000 = 1005
assert.strictEqual(
    calculateTechCrystalsSpent([[1], [1]], [tabA, tabB]),
    1005,
    "two trees should sum correctly",
);

// Empty tabs → 0 (graceful degradation)
assert.strictEqual(
    calculateTechCrystalsSpent([[1, 2, 3]], []),
    0,
    "empty tabs should return 0",
);

// Tab count less than tree count → sums available tabs only
assert.strictEqual(
    calculateTechCrystalsSpent([[1], [1]], [tabA]),
    5,
    "missing tab should contribute 0",
);

// Node index out of bounds within a tab → !node guard fires, contributes 0
assert.strictEqual(
    calculateTechCrystalsSpent([[1, 99]], [tabA]),
    5,
    "out-of-bounds node index should be skipped",
);

console.log("calculateTechCrystalsSpent: all tests passed");
```

- [ ] **Step 2: Register test in `test/index.ts`**

In the `// 2. Core State & Logic` section, add after `"skillBonusStore.test.ts"`:

```ts
    "calculateTechCrystalsSpent.test.ts",
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx tsx test/calculateTechCrystalsSpent.test.ts
```

Expected: `TypeError: calculateTechCrystalsSpent is not a function` (or similar — the function does not exist yet).

---

### Task 2: Implement `calculateTechCrystalsSpent` and refactor `techCrystalsFromActivePreset`

**Files:**
- Modify: `src/lib/techCrystalStore.ts`

- [ ] **Step 4: Add the pure function**

In `src/lib/techCrystalStore.ts`, add the following **before** `techCrystalsFromActivePreset`. Insert it after the `initTechCrystalTrees` / `setTechCrystalsOwned` functions at the bottom, or just before the `techCrystalsFromActivePreset` derived declaration — the exact position within the file is flexible as long as it's defined before it's called.

```ts
/**
 * Pure function: sums tech crystals spent across all trees given a build's
 * level arrays and the active tab configs.
 *
 * Extracted from techCrystalsFromActivePreset so it can be called outside
 * the store context (e.g. for computing TC for non-active builds).
 */
export function calculateTechCrystalsSpent(
    trees: number[][],
    tabs: TabConfig[],
): number {
    return trees.reduce((total, levels, tabIndex) => {
        const tab = tabs[tabIndex];
        if (!tab) return total;
        return total + levels.reduce((sum, level, nodeIndex) => {
            const node = tab.nodes[nodeIndex];
            if (!node || !level) return sum;
            const info = getSkillLevelInfo(node.skillId, level, node.maxLevel);
            return sum + info.totalCostSpent;
        }, 0);
    }, 0);
}
```

- [ ] **Step 5: Refactor `techCrystalsFromActivePreset` to delegate to it**

Replace the `spent` calculation inside `techCrystalsFromActivePreset`:

Old (lines ~73-85):
```ts
        const owned = buildData.owned ?? 0;
        const spent = buildData.trees.reduce(
            (total, levels, tabIndex) => {
                const tab = $activeTabs[tabIndex];
                if (!tab) return total;
                return total + levels.reduce((sum, level, nodeIndex) => {
                    const node = tab.nodes[nodeIndex];
                    if (!node || !level) return sum;
                    const info = getSkillLevelInfo(node.skillId, level, node.maxLevel);
                    return sum + info.totalCostSpent;
                }, 0);
            },
            0,
        );

        return { owned, spent };
```

New:
```ts
        return {
            owned: buildData.owned ?? 0,
            spent: calculateTechCrystalsSpent(buildData.trees, $activeTabs),
        };
```

- [ ] **Step 6: Run the test to confirm it passes**

```bash
npx tsx test/calculateTechCrystalsSpent.test.ts
```

Expected: `calculateTechCrystalsSpent: all tests passed`

- [ ] **Step 7: Run full type-check to catch any issues**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/techCrystalStore.ts test/calculateTechCrystalsSpent.test.ts test/index.ts
git commit -m "refactor: extract calculateTechCrystalsSpent pure function from techCrystalStore"
```

---

## Chunk 2: Button `descriptionIcon` + Dropdown wiring

### Task 3: Add `descriptionIcon` prop to `Button.svelte`

**Files:**
- Modify: `src/lib/Button.svelte`

- [ ] **Step 1: Add the prop declaration**

After the existing `export let description: string | undefined = undefined;` line, add:

```ts
    export let descriptionIcon: Component | null = null;
```

- [ ] **Step 2: Update the template**

Find the existing description span:

```svelte
            <span class="button-description">{description}</span>
```

Replace with:

```svelte
            <span class="button-description">
                {#if descriptionIcon}
                    <svelte:component
                        this={descriptionIcon}
                        class="button-description-icon"
                        aria-hidden={true}
                        size={12}
                    />
                {/if}
                {description}
            </span>
```

- [ ] **Step 3: Update `.button-description` CSS**

Find the existing `.button-description` rule in `<style>`:

```css
    .button-description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        white-space: normal;
        overflow-wrap: anywhere;
    }
```

Replace with:

```css
    .button-description {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        white-space: normal;
        overflow-wrap: anywhere;
    }
```

- [ ] **Step 4: Run type-check**

```bash
npm run check
```

Expected: 0 errors. The `descriptionIcon` prop defaults to `null`, so all existing callers are unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/lib/Button.svelte
git commit -m "feat: add descriptionIcon prop to Button for inline icon+text descriptions"
```

---

### Task 4: Write failing contract test for the dropdown

**Files:**
- Create: `test/previewBuildsDropdownTcDescription.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 6: Create the contract test**

```ts
// test/previewBuildsDropdownTcDescription.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/buttons/PreviewBuildsDropdown.svelte"),
    "utf8",
);

if (!source.includes("calculateTechCrystalsSpent")) {
    throw new Error(
        "PreviewBuildsDropdown should import and use calculateTechCrystalsSpent from techCrystalStore",
    );
}

if (!source.includes("TechCrystalIcon")) {
    throw new Error(
        "PreviewBuildsDropdown should import TechCrystalIcon from customIcons",
    );
}

if (!source.includes("descriptionIcon={build.tcSpent")) {
    throw new Error(
        "PreviewBuildsDropdown should wire tcSpent to the descriptionIcon prop on each premade build Button",
    );
}

if (!source.includes("toLocaleString()")) {
    throw new Error(
        "PreviewBuildsDropdown should format the TC count with toLocaleString()",
    );
}

if (!source.includes("tcSpent > 0")) {
    throw new Error(
        "PreviewBuildsDropdown should suppress the description when tcSpent is 0 (no transient zero display)",
    );
}
```

- [ ] **Step 7: Register test in `test/index.ts`**

In the `// 5. UI & Interaction` section, add after `"shareBuildButtonComposeOpen.test.ts"`:

```ts
    "previewBuildsDropdownTcDescription.test.ts",
```

- [ ] **Step 8: Run test to confirm it fails**

```bash
npx tsx test/previewBuildsDropdownTcDescription.test.ts
```

Expected: throws with `"PreviewBuildsDropdown should import and use calculateTechCrystalsSpent..."` (the source doesn't have these yet).

---

### Task 5: Wire TC count into `PreviewBuildsDropdown.svelte`

**Files:**
- Modify: `src/lib/buttons/PreviewBuildsDropdown.svelte`

- [ ] **Step 9: Add new imports**

In the `<script>` block, add to the existing imports:

```ts
    import { TechCrystalIcon } from "../customIcons";
    import { calculateTechCrystalsSpent, activeTabs } from "../techCrystalStore";
    import { decodeBuildData } from "../buildData/encoder";
```

- [ ] **Step 10: Update `$: premadeBuilds` to include `tcSpent`**

Find the existing reactive declaration:

```ts
    $: premadeBuilds = recommendedBuilds.map((build) => {
        const rawName = build.displayName ?? $t("preview.title");
        const localizedName = premadeBuildLabelKeys[rawName]
            ? $t(premadeBuildLabelKeys[rawName])
            : rawName;
        return {
            rawName,
            name: localizedName,
            code: build.encoded,
        };
    });
```

Replace with:

```ts
    $: premadeBuilds = recommendedBuilds.map((build) => {
        const rawName = build.displayName ?? $t("preview.title");
        const localizedName = premadeBuildLabelKeys[rawName]
            ? $t(premadeBuildLabelKeys[rawName])
            : rawName;
        const buildData = decodeBuildData(build.encoded);
        const tcSpent = buildData
            ? calculateTechCrystalsSpent(buildData.trees, $activeTabs)
            : 0;
        return {
            rawName,
            name: localizedName,
            code: build.encoded,
            tcSpent,
        };
    });
```

- [ ] **Step 11: Add `description` and `descriptionIcon` to each premade Button**

Find:

```svelte
                <Button
                    icon={premadeBuildIcons[build.rawName] ?? ShareNetworkIcon}
                    tooltipText={$t("preview.previewBuildTooltip", {
                        name: build.name,
                    })}
                    on:click={() => handlePremadeClick(build.code)}
                >
                    {build.name}
                </Button>
```

Replace with:

```svelte
                <Button
                    icon={premadeBuildIcons[build.rawName] ?? ShareNetworkIcon}
                    tooltipText={$t("preview.previewBuildTooltip", {
                        name: build.name,
                    })}
                    description={build.tcSpent > 0 ? build.tcSpent.toLocaleString() : undefined}
                    descriptionIcon={build.tcSpent > 0 ? TechCrystalIcon : null}
                    on:click={() => handlePremadeClick(build.code)}
                >
                    {build.name}
                </Button>
```

- [ ] **Step 12: Run the contract test to confirm it passes**

```bash
npx tsx test/previewBuildsDropdownTcDescription.test.ts
```

Expected: passes silently (no output, no thrown errors).

- [ ] **Step 13: Run full test suite**

```bash
npm test
```

Expected: all tests pass, 0 errors, 0 type errors.

- [ ] **Step 14: Commit**

```bash
git add src/lib/buttons/PreviewBuildsDropdown.svelte test/previewBuildsDropdownTcDescription.test.ts test/index.ts
git commit -m "feat: show tech crystals spent on recommended build buttons in preview dropdown"
```
