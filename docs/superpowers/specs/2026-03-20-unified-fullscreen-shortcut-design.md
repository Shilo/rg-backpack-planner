# Unified Fullscreen Shortcut (F11)

## Problem

The app has a FullscreenToggle button that uses the DOM Fullscreen API (`requestFullscreen`/`exitFullscreen`), but browsers also support F11 for fullscreen. These are fundamentally different mechanisms:

- **F11** triggers browser-level fullscreen. It does NOT fire the `fullscreenchange` DOM event, and `document.fullscreenElement` remains `null`.
- **Fullscreen API** triggers DOM-level fullscreen. It fires `fullscreenchange` and sets `document.fullscreenElement`.

Because the FullscreenToggle only listens to `fullscreenchange`, pressing F11 leaves the button icon out of sync with the actual window state.

## Solution

Intercept F11 via the existing keyboard action system, `preventDefault()` to block the browser's native handling, and route through the Fullscreen API. This makes `fullscreenchange` the single source of truth for all fullscreen state.

### Platform behavior

- **Windows/Linux**: F11 is interceptable via `preventDefault()` in Chrome and Firefox.
- **macOS**: F11 is mapped to "Show Desktop" by default. If the key reaches the browser (fn+F11 or "standard function keys" setting), we handle it. If macOS consumes it, nothing happens — no broken state.
- **iOS/Android**: No keyboard shortcut to intercept. Fullscreen API works natively via the button.

## Changes

### 1. `src/lib/input/keyboardAction.ts` — Register the action

- Add `"fullscreen"` to the `KeyboardActionType` union.
- Add `F11: "F11"` to the `Key` constant object.
- Add `{ action: "fullscreen", key: Key.F11 }` to `KEYBOARD_ACTION_BINDINGS`.

### 2. `src/App.svelte` — Handle the action

Add a `case "fullscreen"` to the existing `handleKeyDown` switch:

```ts
case "fullscreen":
    e.preventDefault();
    triggerShortcutFlash("fullscreen");
    toggleFullscreen();
    break;
```

Import `toggleFullscreen` from `"./lib/fullscreen"`. The returned promise is intentionally not awaited — `fullscreenchange` handles state updates asynchronously, and error feedback is unnecessary for a keyboard shortcut (the user can just press F11 again). No guard for `hasOnboardingOverlay()` needed — fullscreen is harmless during onboarding.

### 3. `src/lib/buttons/FullscreenToggle.svelte` — Tooltip shortcut + flash

In the `iconButton` Button render:

- Add `shortcut={getKeyboardActionLabel("fullscreen", $t)}` — Button's existing `buildShortcutTooltip` wires this into the tooltip automatically.
- Add `flashOnAction="fullscreen"` — Button's existing flash system handles visual feedback.

Import `getKeyboardActionLabel` from `"../input"`.

The ToggleSwitch render in Settings gets no shortcut tooltip (it's a settings page, not an action button).

### 4. `src/locales/en.json` — Locale string

Add to the `input.keyboard` object:

```json
"fullscreen": "F11"
```

### 5. `src/lib/sideMenuPages/SideMenuControlsPage.svelte` — Controls page

- Add `$: keyFullscreen = getKeyboardActionLabel("fullscreen", $t);` alongside the other keyboard action labels.
- Add `<span class="control-shortcut"><Kbd keys={keyFullscreen} /></span>` to the existing fullscreen HUD entry (currently the only HUD entry without a shortcut display).

### What stays the same

- **`src/lib/fullscreen.ts`** — Untouched. Remains a pure utility module with no side effects.
- **`fullscreenchange` listener in FullscreenToggle** — Still needed for when the Settings toggle or the button itself triggers fullscreen via clicks.
- **`src/lib/input/index.ts`** — No change needed. `KeyboardActionType` is already re-exported as a type.

## Testing

- Press F11 on desktop: should enter/exit fullscreen via the API, button icon should update, button should flash.
- Click the fullscreen button: should work as before, F11 afterward should correctly exit.
- Tooltip on the HUD fullscreen button should show "F11" on keyboard devices, hidden on touch-only.
- Controls page HUD section should show the F11 shortcut under the fullscreen entry.
- On mobile/touch-only: no shortcut displayed, button works as before.
