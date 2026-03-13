# Onboarding Overlay Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-load onboarding overlay that teaches node and tree controls, plus a "Show Tutorial" setting button and controls page link.

**Architecture:** A localStorage-backed `onboardingStore` tracks whether the overlay has been seen. `OnboardingOverlay.svelte` renders inside `Tree.svelte` (to inherit tree context) as a fixed overlay with a cloned `Node` component and input-aware control chips. A "Show Tutorial" button in `GeneralSettingsPage` resets the store. The Controls page gains a link to re-show the tutorial.

**Tech Stack:** Svelte 5, TypeScript, svelte-whisper (i18n), phosphor-svelte icons, localStorage via `storage.ts`

**Spec:** `docs/superpowers/specs/2026-03-13-onboarding-overlay-design.md`

**Spec deviation:** The spec lists "Show tutorial again" setting and "Changes to the Controls page" as out of scope. The user explicitly requested both after approving the spec. This plan includes them as Tasks 6-7.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/onboardingStore.ts` | localStorage-backed boolean store for "onboarding-seen" |
| Create | `src/lib/OnboardingOverlay.svelte` | Full-viewport overlay with cloned Node, control chips, animations |
| Modify | `src/lib/Tree.svelte` | Import and conditionally render OnboardingOverlay |
| Modify | `src/locales/en.json` | Add `onboarding.*` keys |
| Modify | `src/locales/ja.json` | Add `onboarding.*` keys (Japanese) |
| Modify | `src/locales/zh.json` | Add `onboarding.*` keys (Chinese) |
| Modify | `src/lib/sideMenuPages/GeneralSettingsPage.svelte` | Add "Show Tutorial" button + reset in handleResetSettings |
| Modify | `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Add "Show Tutorial" button at top |
| Create | `test/onboardingStore.test.ts` | Test store file structure and patterns |
| Modify | `test/index.ts` | Register onboardingStore test |

---

## Chunk 1: Store + i18n + Test

### Task 1: Create onboardingStore

**Files:**
- Create: `src/lib/onboardingStore.ts`

- [ ] **Step 1: Write the store file**

Follow the `showTierStore.ts` pattern exactly. The store manages a boolean flag for whether onboarding has been seen.

```ts
import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

const DEFAULT_ONBOARDING_SEEN = false;

function parseOnboardingSeen(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getOnboardingSeen(): boolean {
    const stored = parseOnboardingSeen(getItem("onboarding-seen"));
    return stored ?? DEFAULT_ONBOARDING_SEEN;
}

function setOnboardingSeen(value: boolean) {
    setItem("onboarding-seen", String(value));
}

function createOnboardingSeenStore() {
    const { subscribe, set } = writable(getOnboardingSeen());

    return {
        subscribe,
        set: (value: boolean) => {
            setOnboardingSeen(value);
            set(value);
        },
        resetToDefault: () => {
            setOnboardingSeen(DEFAULT_ONBOARDING_SEEN);
            set(DEFAULT_ONBOARDING_SEEN);
        },
    };
}

export const onboardingSeen = createOnboardingSeenStore();
```

- [ ] **Step 2: Verify it compiles**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors related to onboardingStore

### Task 2: Write onboardingStore test

**Files:**
- Create: `test/onboardingStore.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Write the test file**

Follow the `showTierSetting.test.ts` pattern — read source files and verify structure with regex assertions. In Chunk 1, only assert on the store file and i18n keys (artifacts produced by this chunk). Integration assertions (Tree.svelte, GeneralSettingsPage) are added in Chunk 3 Task 8.

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- Store file structure ---
const storePath = resolve("src/lib/onboardingStore.ts");
let storeSource = "";

try {
    storeSource = readFileSync(storePath, "utf8");
} catch {
    throw new Error("onboardingStore.ts should exist.");
}

if (!/DEFAULT_ONBOARDING_SEEN\s*=\s*false/.test(storeSource)) {
    throw new Error("onboardingStore default should be false.");
}

if (!/getItem\("onboarding-seen"\)/.test(storeSource)) {
    throw new Error("onboardingStore should read from onboarding-seen storage key.");
}

if (!/setItem\("onboarding-seen",\s*String\(value\)\)/.test(storeSource)) {
    throw new Error("onboardingStore should persist onboarding-seen boolean values as strings.");
}

if (!/resetToDefault:\s*\(\)\s*=>\s*\{/.test(storeSource)) {
    throw new Error("onboardingStore should expose resetToDefault().");
}

// --- i18n keys in all locales ---
const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const source = readFileSync(localePath, "utf8");
    if (!/"onboarding"\s*:\s*\{/.test(source)) {
        throw new Error(`${localePath}: onboarding translation section is required.`);
    }
    if (!/"dismissClick"/.test(source)) {
        throw new Error(`${localePath}: onboarding.dismissClick key is required.`);
    }
    if (!/"dismissTap"/.test(source)) {
        throw new Error(`${localePath}: onboarding.dismissTap key is required.`);
    }
    if (!/"nodesSection"/.test(source)) {
        throw new Error(`${localePath}: onboarding.nodesSection key is required.`);
    }
    if (!/"treeSection"/.test(source)) {
        throw new Error(`${localePath}: onboarding.treeSection key is required.`);
    }
    if (!/"showTutorial"/.test(source)) {
        throw new Error(`${localePath}: onboarding.showTutorial key is required.`);
    }
    if (!/"showTutorialToast"/.test(source)) {
        throw new Error(`${localePath}: onboarding.showTutorialToast key is required.`);
    }
}

// --- Integration assertions (Tree.svelte, GeneralSettingsPage) ---
// These verify Chunk 3 integration. They are added here because the test
// runs after all chunks are complete. If running Chunk 1 in isolation,
// these will fail until Chunk 3 is done.

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (!/import.*onboardingSeen.*from.*\.\/onboardingStore/.test(treeSource)) {
    throw new Error("Tree.svelte should import onboardingSeen from onboardingStore.");
}

if (!/OnboardingOverlay/.test(treeSource)) {
    throw new Error("Tree.svelte should render OnboardingOverlay component.");
}

const generalPath = resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte");
const generalSource = readFileSync(generalPath, "utf8");

if (!/onboardingSeen/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should import onboardingSeen store.");
}

if (!/onboardingSeen\.resetToDefault\(\)/.test(generalSource)) {
    throw new Error("GeneralSettingsPage reset should include onboardingSeen.resetToDefault().");
}
```

- [ ] **Step 2: Register the test in test/index.ts**

Add `"onboardingStore.test.ts"` to the `TEST_FILES` array in `test/index.ts`, in the "5. UI & Interaction" section, after `"serviceWorkerUpdateToast.test.ts"` (at the end of the list).

- [ ] **Step 3: Run test to verify store + i18n assertions pass**

Run the test after Task 3 (i18n) is complete. The store and i18n assertions will pass. The integration assertions (Tree.svelte, GeneralSettingsPage) will fail — this is expected until Chunk 3.

Run: `npm test 2>&1 | tail -20`
Expected: `onboardingStore.test.ts failed` with "Tree.svelte should import onboardingSeen" (integration assertions not yet satisfied).

### Task 3: Add i18n keys to all three locales

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`

- [ ] **Step 1: Add onboarding keys to en.json**

Insert after the `"controls"` section (before `"install"`). Add:

```json
"onboarding": {
    "nodesSection": "Nodes",
    "treeSection": "Tree",
    "levelUp": "Level up",
    "options": "Options",
    "levelDown": "Level down",
    "treeOptions": "Tree options",
    "pan": "Pan",
    "zoom": "Zoom",
    "dismissClick": "Click anywhere to start",
    "dismissTap": "Tap anywhere to start",
    "leftClick": "Left Click",
    "rightClick": "Right Click",
    "middleClick": "Middle Click",
    "clickDrag": "Click + Drag",
    "scroll": "Scroll",
    "tap": "Tap",
    "longPress": "Long Press",
    "swipe": "Swipe",
    "pinch": "Pinch",
    "showTutorial": "Show Tutorial",
    "showTutorialDescription": "Replay the first-load controls guide",
    "showTutorialToast": "Tutorial will show on next tree load"
},
```

All "Show Tutorial" keys live in the `onboarding.*` namespace — no duplicate `settings.*` keys needed.

- [ ] **Step 2: Add onboarding keys to ja.json**

```json
"onboarding": {
    "nodesSection": "ノード",
    "treeSection": "ツリー",
    "levelUp": "レベルアップ",
    "options": "オプション",
    "levelDown": "レベルダウン",
    "treeOptions": "ツリーオプション",
    "pan": "移動",
    "zoom": "ズーム",
    "dismissClick": "クリックして開始",
    "dismissTap": "タップして開始",
    "leftClick": "左クリック",
    "rightClick": "右クリック",
    "middleClick": "中クリック",
    "clickDrag": "クリック＆ドラッグ",
    "scroll": "スクロール",
    "tap": "タップ",
    "longPress": "長押し",
    "swipe": "スワイプ",
    "pinch": "ピンチ",
    "showTutorial": "チュートリアルを表示",
    "showTutorialDescription": "初回操作ガイドを再表示",
    "showTutorialToast": "次のツリー読み込み時にチュートリアルを表示します"
},
```

All "Show Tutorial" keys live in the `onboarding.*` namespace — no duplicate `settings.*` keys needed.

- [ ] **Step 3: Add onboarding keys to zh.json**

```json
"onboarding": {
    "nodesSection": "节点",
    "treeSection": "技能树",
    "levelUp": "升级",
    "options": "选项",
    "levelDown": "降级",
    "treeOptions": "技能树选项",
    "pan": "平移",
    "zoom": "缩放",
    "dismissClick": "点击任意位置开始",
    "dismissTap": "点按任意位置开始",
    "leftClick": "左键点击",
    "rightClick": "右键点击",
    "middleClick": "中键点击",
    "clickDrag": "点击并拖动",
    "scroll": "滚动",
    "tap": "点按",
    "longPress": "长按",
    "swipe": "滑动",
    "pinch": "捏合",
    "showTutorial": "显示教程",
    "showTutorialDescription": "重新播放首次操作指南",
    "showTutorialToast": "教程将在下次加载技能树时显示"
},
```

All "Show Tutorial" keys live in the `onboarding.*` namespace — no duplicate `settings.*` keys needed.

- [ ] **Step 4: Commit chunk 1**

```bash
git add src/lib/onboardingStore.ts src/locales/en.json src/locales/ja.json src/locales/zh.json test/onboardingStore.test.ts test/index.ts
git commit -m "feat(onboarding): add store, i18n keys, and test scaffold"
```

---

## Chunk 2: OnboardingOverlay Component

### Task 4: Create OnboardingOverlay.svelte

**Files:**
- Create: `src/lib/OnboardingOverlay.svelte`

This is the main overlay component. It renders inside `Tree.svelte` to inherit `getContext("tree")`.

- [ ] **Step 1: Write the component**

Structure:
- Fixed-position overlay covering full viewport (`position: fixed; inset: 0`)
- Dark semi-transparent backdrop (`rgba(0,0,0,0.75)`)
- Centered flex column with: section labels, cloned Node, chip groups, dismiss hint
- Detects input type via `matchMedia("(pointer: coarse)")`
- Dismisses on `pointerdown` anywhere on the overlay
- z-index: `var(--z-index-context-menu)` (20) — above nodes, below modals (30). No context menu can be open when the overlay shows, so no conflict.
- `prefers-reduced-motion` support: skip scale/stagger animations

**Imports and prop declarations:**

```svelte
<script lang="ts">
    import type { Component } from "svelte";
    import { onMount } from "svelte";
    import {
        ArrowsOutCardinalIcon,
        HandGrabbingIcon,
        HandTapIcon,
        MouseLeftClickIcon,
        MouseMiddleClickIcon,
        MouseRightClickIcon,
        MouseScrollIcon,
    } from "phosphor-svelte";
    import LongPressIcon from "./icons/LongPressIcon.svelte";
    import PinchIcon from "./icons/PinchIcon.svelte";
    import Node from "./Node.svelte";
    import { t } from "svelte-whisper";

    export let onDismiss: () => void;
</script>
```

Key implementation details:

**Cloned Node:** Render a real `<Node>` component with these props:
```svelte
<div class="onboarding-node-wrapper" aria-hidden="true">
    <Node
        id={-1}
        skillId="attack_boost"
        state="available"
        level={0}
        maxLevel={100}
        tier={0}
        label={$t("skills.attack_boost")}
        scale={1}
        radius={1}
        region="right"
        showSkillName={true}
        showTier={true}
    />
</div>
```

The wrapper div has `pointer-events: none` to make the node non-interactive. The node's `actionPreview` computation runs harmlessly with `id={-1}` (produces null). The `tooltip` directive won't trigger because pointer-events are disabled.

**Input detection** (in `onMount`):
```ts
let isTouch = false;
onMount(() => {
    isTouch = window.matchMedia("(pointer: coarse)").matches;
});
```

**Chip data structure:**
```ts
type ChipData = {
    icon: Component;
    label: string;
    description: string;
};
```

**Mouse chips (Nodes zone):**
```ts
{ icon: MouseLeftClickIcon, label: $t("onboarding.leftClick"), description: $t("onboarding.levelUp") }
{ icon: MouseRightClickIcon, label: $t("onboarding.rightClick"), description: $t("onboarding.options") }
{ icon: MouseMiddleClickIcon, label: $t("onboarding.middleClick"), description: $t("onboarding.levelDown") }
```

**Mouse chips (Tree zone):**
```ts
{ icon: MouseRightClickIcon, label: $t("onboarding.rightClick"), description: $t("onboarding.treeOptions") }
{ icon: ArrowsOutCardinalIcon, label: $t("onboarding.clickDrag"), description: $t("onboarding.pan") }
{ icon: MouseScrollIcon, label: $t("onboarding.scroll"), description: $t("onboarding.zoom") }
```

**Touch chips (Nodes zone):**
```ts
{ icon: HandTapIcon, label: $t("onboarding.tap"), description: $t("onboarding.levelUp") }
{ icon: LongPressIcon, label: $t("onboarding.longPress"), description: $t("onboarding.options") }
```

**Touch chips (Tree zone):**
```ts
{ icon: LongPressIcon, label: $t("onboarding.longPress"), description: $t("onboarding.treeOptions") }
{ icon: HandGrabbingIcon, label: $t("onboarding.swipe"), description: $t("onboarding.pan") }
{ icon: PinchIcon, label: $t("onboarding.pinch"), description: $t("onboarding.zoom") }
```

**Animation (CSS):**
- Backdrop: `@keyframes overlay-fade-in` opacity 0→1 over 300ms
- Node wrapper: `@keyframes node-enter` scale 0.9→1 + opacity 0→1 over 250ms with `var(--ease-decel)`
- Chips: stagger via `animation-delay` of `calc(var(--chip-index) * 50ms)`, `@keyframes chip-enter` translateY(8px)→0 + opacity 0→1
- Exit: `@keyframes overlay-fade-out` opacity 1→0 over 200ms (applied when dismissing via a `dismissing` class)
- `@media (prefers-reduced-motion: reduce)`: all animations set to `none`, opacity is instant

**Dismissal flow:**
1. On `pointerdown` on the overlay, set `dismissing = true`
2. After 200ms (or immediately with reduced-motion), call `onDismiss()`

**Template structure:**
```svelte
<!-- svelte:window not needed — event is on the overlay div -->
<div
    class="onboarding-overlay"
    class:dismissing
    role="dialog"
    aria-label="Controls tutorial"
    on:pointerdown={handleDismiss}
>
    <div class="onboarding-content">
        <!-- Nodes zone -->
        <div class="onboarding-zone onboarding-zone-nodes">
            <span class="onboarding-zone-label">{$t("onboarding.nodesSection")}</span>
            <div class="onboarding-node-wrapper" aria-hidden="true">
                <Node ...props />
            </div>
            <div class="onboarding-chips">
                {#each nodeChips as chip, i}
                    <div class="onboarding-chip accent" style="--chip-index: {i}">
                        <span class="onboarding-chip-icon" aria-hidden="true">
                            <svelte:component this={chip.icon} />
                        </span>
                        <span class="onboarding-chip-label">{chip.label}</span>
                        <span class="onboarding-chip-desc">{chip.description}</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Divider -->
        <div class="onboarding-divider"></div>

        <!-- Tree zone -->
        <div class="onboarding-zone onboarding-zone-tree">
            <span class="onboarding-zone-label muted">{$t("onboarding.treeSection")}</span>
            <div class="onboarding-chips">
                {#each treeChips as chip, i}
                    <div class="onboarding-chip muted" style="--chip-index: {nodeChips.length + i}">
                        <span class="onboarding-chip-icon" aria-hidden="true">
                            <svelte:component this={chip.icon} />
                        </span>
                        <span class="onboarding-chip-label">{chip.label}</span>
                        <span class="onboarding-chip-desc">{chip.description}</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Dismiss hint -->
        <span class="onboarding-dismiss-hint">
            {isTouch ? $t("onboarding.dismissTap") : $t("onboarding.dismissClick")}
        </span>
    </div>
</div>
```

**CSS design tokens used:**
- `--accent` for node zone chip borders/text
- `--text-muted` for tree zone chip borders/text (muted appearance)
- `--ease-decel` for entry animation easing
- `--font-sm`, `--font-xs` for chip typography
- `--spacing-*` for gaps and padding
- `--radius` for chip border-radius

- [ ] **Step 2: Verify it compiles**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors related to OnboardingOverlay

- [ ] **Step 3: Commit**

```bash
git add src/lib/OnboardingOverlay.svelte
git commit -m "feat(onboarding): add OnboardingOverlay component with two-zone chip layout"
```

---

## Chunk 3: Tree Integration + Settings + Controls Page + Final Test

### Task 5: Integrate overlay into Tree.svelte

**Files:**
- Modify: `src/lib/Tree.svelte`

- [ ] **Step 1: Add imports**

At the top of the `<script lang="ts">` block (around line 12, with other imports), add:

```ts
import OnboardingOverlay from "./OnboardingOverlay.svelte";
import { onboardingSeen } from "./onboardingStore";
```

- [ ] **Step 2: Add overlay rendering**

Inside the `tree-viewport` div, after the `tree-splash-layer` div (around line 1514, before the closing `</div>` of `tree-viewport`), add:

```svelte
{#if !$onboardingSeen}
    <OnboardingOverlay
        onDismiss={() => onboardingSeen.set(true)}
    />
{/if}
```

The overlay renders inside `tree-viewport`, so it inherits `getContext("tree")` from `Tree.svelte`. It sits above all tree content via z-index but below modals/toasts which render at the App level.

- [ ] **Step 3: Verify it compiles**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors

### Task 6: Add "Show Tutorial" button to GeneralSettingsPage

**Files:**
- Modify: `src/lib/sideMenuPages/GeneralSettingsPage.svelte`

- [ ] **Step 1: Import the store and icon**

Add to imports at the top:

```ts
import { BookOpenTextIcon } from "phosphor-svelte";
import { onboardingSeen } from "../onboardingStore";
```

- [ ] **Step 2: Add "Show Tutorial" button**

In the Application section (after `<InstallPwaButton title={true} />`), add:

```svelte
<Button
    on:click={() => {
        onboardingSeen.resetToDefault();
        showToast($t("onboarding.showTutorialToast"));
        onClose?.();
    }}
    description={$t("onboarding.showTutorialDescription")}
    icon={BookOpenTextIcon}
>
    {$t("onboarding.showTutorial")}
</Button>
```

- [ ] **Step 3: Add onboardingSeen to handleResetSettings**

In the `handleResetSettings` function's `onConfirm` callback, add `onboardingSeen.resetToDefault();` after the existing `showLevelSplash.resetToDefault();` line (around line 57). This ensures "Reset Settings" also resets the onboarding flag.

- [ ] **Step 4: Verify it compiles**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors

### Task 7: Add "Show Tutorial" button to SideMenuControlsPage

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuControlsPage.svelte`

- [ ] **Step 1: Import the store and dependencies**

Add these new imports (do NOT duplicate `Button` which is already imported):

```ts
import { onboardingSeen } from "../onboardingStore";
import { showToast } from "../toast";
```

Also add `BookOpenTextIcon` to the existing `phosphor-svelte` import block (lines 4-22) — do not create a separate import statement.

- [ ] **Step 2: Add "Show Tutorial" button**

At the top of the `controls-sections` div (right after the `app-card` section, before the Instructions accordion), add:

```svelte
<Button
    on:click={() => {
        onboardingSeen.resetToDefault();
        showToast($t("onboarding.showTutorialToast"));
    }}
    description={$t("onboarding.showTutorialDescription")}
    icon={BookOpenTextIcon}
>
    {$t("onboarding.showTutorial")}
</Button>
```

### Task 8: Run tests and verify

- [ ] **Step 1: Run the full test suite**

Run: `npm test 2>&1 | tail -30`
Expected: All tests pass, including the new `onboardingStore.test.ts`.

- [ ] **Step 2: Run svelte-check**

Run: `npm run check 2>&1 | tail -20`
Expected: No type errors

- [ ] **Step 3: Test in dev server**

Run: `npm run dev` and verify in browser:
1. Open the app — onboarding overlay should appear
2. Overlay shows a real Node with skill name and tier badges
3. Mouse users see 6 chips (3 node + 3 tree) with correct icons
4. Click anywhere — overlay dismisses with fade-out
5. Refresh — overlay does NOT appear again
6. Open Settings > General > "Show Tutorial" — toast appears
7. Refresh — overlay appears again
8. Open Controls page — "Show Tutorial" button is at the top

- [ ] **Step 4: Commit all integration changes**

```bash
git add src/lib/Tree.svelte src/lib/sideMenuPages/GeneralSettingsPage.svelte src/lib/sideMenuPages/SideMenuControlsPage.svelte
git commit -m "feat(onboarding): integrate overlay into Tree, add Show Tutorial to Settings and Controls"
```

- [ ] **Step 5: Run final full test**

Run: `npm test`
Expected: All tests pass (including onboardingStore.test.ts).
