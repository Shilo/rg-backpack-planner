# Onboarding Steps Tuning

Reduce icon/title redundancy between step headers and their first card across steps 3–9.

## Changes

### Step 3 — Root (`id: "root"`)
- **Title**: Keep `translate("onboarding.rootSection")` (already "Root Node")
- **Card 1**: Override title → `translate("onboarding.quickSettings")`, icon → `GearSixIcon`

### Step 4 — Tree (`id: "tree"`)
- **Title icon**: `DotsNineIcon` (was `ArrowsOutCardinalIcon`, redundant with card 1 pan icon)

### Step 5 — HUD/Budget (`id: "hud"`)
- **Card 1**: Override title → `translate("onboarding.setBudget")`, icon → `CoinIcon`

### Step 6 — Preview (`id: "preview"`)
- **Card 1**: Override title → `translate("onboarding.previewOptions")`, icon → `ListIcon`

### Step 7 — Primary Action (`id: "primary-action"`)
- **Card 1**: Override title → `translate("onboarding.changePrimaryAction", { input: labels.primary.toLowerCase() })`, icon → `RepeatIcon`

### Step 8 — Toolbar (`id: "toolbar"`)
- **Title**: `translate("onboarding.historyToolbar")` (was "Toolbar")

### Step 9 — Bottombar (`id: "bottombar"`)
- **Title**: `translate("onboarding.navigationBar")` (was bottombar section)
- **Title icon**: `TabsIcon` (was `DotsThreeOutlineIcon`)

## New Translation Keys (en.json)

```json
"quickSettings": "Quick Settings",
"setBudget": "Set your budget",
"previewOptions": "Preview Options",
"changePrimaryAction": "Change node {input} action",
"historyToolbar": "History Toolbar",
"navigationBar": "Navigation Bar"
```

## New Phosphor Imports

`GearSixIcon`, `DotsNineIcon`, `CoinIcon`, `RepeatIcon`, `TabsIcon`

## Implementation Approach

- Override card properties by spreading `controlCard()` result and replacing `icon`, `title`, and `label` fields
- This preserves input bindings from the control action data
- All new text uses translation keys, no hardcoded strings

## Files Modified

- `src/lib/onboarding/onboardingSteps.ts` — icon imports, card overrides, title changes
- `src/locales/en.json` — new onboarding translation keys
