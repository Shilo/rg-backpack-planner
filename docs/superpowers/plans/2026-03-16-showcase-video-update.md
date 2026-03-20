# Showcase Video Update Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the showcase video to match the app's default theme, feature NodeContextMenu in the intro, show onboarding on "Plan Your Builds", and refresh outro copy.

**Architecture:** Two primary files change — the Remotion component (`Showcase.tsx`) for colors/content/sizing, and the Playwright capture script for screenshot flow. The SKILL.md doc is updated to match.

**Tech Stack:** Remotion (React), Playwright, Svelte 5 PWA (capture target)

**Spec:** `docs/superpowers/specs/2026-03-16-showcase-video-update-design.md`

---

### Task 1: Update Showcase.tsx Colors

**Files:**
- Modify: `showcase-video/src/Showcase.tsx`

- [ ] **Step 1: Replace background color**

Find both occurrences of `#0f172a` and replace with `#00040e`:
- Line 130: outer `AbsoluteFill` `backgroundColor`
- Line 137: intro `AbsoluteFill` `backgroundColor`

Also replace the default `color: 'white'` on the outer `AbsoluteFill` (line 131) with `color: '#d7ebf7'`.

- [ ] **Step 2: Replace accent color**

Find all occurrences of `#06b6d4` and replace with `#00adfc`:
- Line 148: Title `color` prop for "Backpack Planner"
- Line 59: `CheckCircle2` icon `color`
- Line 175: `Link` icon `color` (intro)
- Line 235: Title `color` prop for "Build & Optimize Now"
- Line 252: `Link` icon `color` (outro)

- [ ] **Step 3: Replace text colors**

Replace `color: 'white'` with `color: '#d7ebf7'` on:
- Line 152: "For Run! Goddess" subtitle
- Line 176: "rgbp.app" text (intro)

Replace `#94a3b8` with `#a7bbc6`:
- Line 164: description paragraph color

- [ ] **Step 4: Replace frame border color**

Find all occurrences of `#1e293b` and replace with `#223b49`:
- Line 89: `MobileFrame` border
- Line 115: `DesktopFrame` border

- [ ] **Step 5: Replace feature box colors**

In `FeatureList` component:
- Line 54: replace `rgba(30, 41, 59, 0.4)` with `rgba(7, 19, 26, 0.6)`
- Line 57: replace `rgba(255, 255, 255, 0.08)` with `rgba(167, 187, 198, 0.1)`

- [ ] **Step 6: Commit**

```bash
git add showcase-video/src/Showcase.tsx
git commit -m "style(video): update Showcase.tsx colors to match default theme (h=234)"
```

---

### Task 2: Update Showcase.tsx Content and Sizing

**Files:**
- Modify: `showcase-video/src/Showcase.tsx`

- [ ] **Step 1: Update intro asset**

Line 181: replace `mobile_late_pve.png` with `mobile_late_pvp_context.png`:
```tsx
<MobileFrame file="mobile_late_pvp_context.png" frame={frame} start={0} />
```

- [ ] **Step 2: Update "Plan Your Builds" asset and DesktopFrame sizing**

Line 202: replace `desktop_late_pvp.png` with `desktop_plan_onboarding.png`:
```tsx
<DesktopFrame file="desktop_plan_onboarding.png" frame={frame} start={110} />
```

Scale up `DesktopFrame` dimensions — change `width: '800px'` to `width: '1000px'` and `height: '450px'` to `height: '563px'` (lines 105-106):
```tsx
width: '1000px',
height: '563px',
```

- [ ] **Step 3: Update outro copy**

Lines 237-241: replace the feature items array:
```tsx
items={[
    "Create Multiple Build Presets",
    "Share and Preview Builds",
    "Use Anywhere, Offline and in Your Language"
]}
```

- [ ] **Step 4: Commit**

```bash
git add showcase-video/src/Showcase.tsx
git commit -m "feat(video): update intro asset, DesktopFrame sizing, and outro copy"
```

---

### Task 3: Update Capture Script

**Files:**
- Modify: `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`

- [ ] **Step 1: Add onboarding suppression to mobile context**

After creating `mobileContext` (after line 33), add:
```js
await mobileContext.addInitScript(() => {
    localStorage.setItem('rg-backpack-planner-onboarding-seen', 'true');
});
```

- [ ] **Step 2: Replace intro capture with Late_PvP + NodeContextMenu**

Replace lines 36-39 (Late PvE mobile capture) with:
```js
console.log(`Navigating to Late PvP (Mobile) with NodeContextMenu...`);
await mPage.goto(`${urlBase}${hashes.late_pvp}`, { waitUntil: 'networkidle' });
await mPage.waitForTimeout(3000);
await mPage.locator('[data-node-id="9"]').click({ button: 'right' });
await mPage.waitForSelector('.context-menu', { state: 'visible', timeout: 5000 });
await mPage.waitForTimeout(500);
await shot('mobile_late_pvp_context.png', mPage);
```

- [ ] **Step 3: Remove mid-game PvE capture and dead hash entries**

Delete lines 41-44 (the `mobile_mid_pve.png` capture block):
```js
// DELETE:
console.log(`Navigating to Mid-Game PvE (Mobile)...`);
await mPage.goto(`${urlBase}${hashes.mid_pve}`, { waitUntil: 'networkidle' });
await mPage.waitForTimeout(3000);
await shot('mobile_mid_pve.png', mPage);
```

Also remove the now-unused hash entries from the `hashes` object (lines 23-24):
```js
// DELETE these two lines:
mid_pve: ",k..k.'2.k.k..a:3;;;37W",
full_tier: "1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1"
```

- [ ] **Step 4: Update desktop context — 1280x720 with onboarding enabled**

Replace lines 104-116 (desktop section) with:
```js
console.log(`--- CAPTURING DESKTOP (1280x720 with Onboarding) ---`);
desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
});
await desktopContext.addInitScript(() => {
    localStorage.setItem('rg-backpack-planner-onboarding-seen', 'false');
});
const dPage = await desktopContext.newPage();

console.log(`Navigating to Late PvP (Desktop with Onboarding)...`);
await dPage.goto(`${urlBase}${hashes.late_pvp}`, { waitUntil: 'networkidle' });
await dPage.waitForTimeout(3000);
await shot('desktop_plan_onboarding.png', dPage);

await desktopContext.close();
```

- [ ] **Step 5: Commit**

```bash
git add .skills/showcase-video-generator/scripts/capture_screenshots.cjs
git commit -m "feat(video): update capture script for new theme screenshots"
```

---

### Task 4: Update SKILL.md

**Files:**
- Modify: `.skills/showcase-video-generator/SKILL.md`

- [ ] **Step 1: Update SKILL.md**

Key changes:
- **Line 13 (Mobile):** Add note about onboarding suppression via `addInitScript`
- **Line 14 (Desktop):** Change resolution from 1080p to `1280x720 @ 2x`. Note onboarding is **enabled** for this capture.
- **Line 15 (Authentic Flow):** Keep Clone sequence description, add that intro captures `NodeContextMenu` via right-click on node 9.
- **Line 20 (Layout):** Note `DesktopFrame` is `1000x563px`.
- **Line 26-31 (Capture Script):** Update screenshot names: `mobile_late_pvp_context.png`, `desktop_plan_onboarding.png`. Remove `mobile_mid_pve.png` reference.
- **Line 36 (Intro):** Update to show Late PvP build with `NodeContextMenu` open.
- **Line 37 (Content Strategy):** Update outro items: "Create Multiple Build Presets", "Share and Preview Builds", "Use Anywhere, Offline and in Your Language".
- **Line 58 (Colors):** Replace cyan `#06b6d4` with sky-blue `#00adfc`. Note background is `#00040e`.
- **Latest Results section:** Update all slide descriptions to match new content.

- [ ] **Step 2: Commit**

```bash
git add .skills/showcase-video-generator/SKILL.md
git commit -m "docs: update showcase video SKILL.md for theme and content changes"
```

---

### Task 5: Delete Old Screenshots and Capture Fresh Ones

**Prerequisites:** Dev server running at `http://localhost:5173`

- [ ] **Step 1: Delete old screenshots**

```bash
rm showcase-video/public/mobile_late_pve.png
rm showcase-video/public/mobile_mid_pve.png
rm showcase-video/public/desktop_late_pvp.png
rm showcase-video/public/mobile_stats.png
rm showcase-video/public/mobile_settings.png
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

Verify it's running at `http://localhost:5173`.

- [ ] **Step 3: Run capture script**

```bash
node .skills/showcase-video-generator/scripts/capture_screenshots.cjs
```

Expected output — 4 `[SUCCESS]` lines:
```
[SUCCESS] Saved mobile_late_pvp_context.png
[SUCCESS] Saved mobile_stats.png
[SUCCESS] Saved mobile_settings.png
[SUCCESS] Saved desktop_plan_onboarding.png
```

- [ ] **Step 4: Verify screenshots exist**

```bash
ls -la showcase-video/public/*.png
```

Should show 4 PNG files with non-zero sizes.

- [ ] **Step 5: Commit**

```bash
git add showcase-video/public/
git commit -m "assets(video): recapture all screenshots with new theme"
```

---

### Task 6: Render Video

- [ ] **Step 1: Render the video**

```bash
cd showcase-video && npm run build
```

Output: `showcase-video/out/video.mp4`

- [ ] **Step 2: Verify output**

Check the file exists and has reasonable size:
```bash
ls -la showcase-video/out/video.mp4
```

- [ ] **Step 3: Final commit (if any uncommitted changes)**

```bash
git status
```
