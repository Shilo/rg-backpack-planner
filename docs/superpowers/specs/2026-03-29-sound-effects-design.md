# Sound Effects — Tier 1 Design Spec

Synthesis-first sound effects for the backpack planner. All sounds are generated at runtime via the Web Audio API — no audio files. Tier 1 only: 4 core sounds covering the primary interaction loop.

Reference: [docs/sound-design.md](../../sound-design.md)

## Files

| File | Purpose |
|---|---|
| `src/lib/soundStore.ts` | Persisted volume/mute state (follows haptics store pattern) |
| `src/lib/soundEngine.ts` | AudioContext management, synthesis functions, pitch helpers, `playSound()` API |

## Sound Store (`soundStore.ts`)

Follows the `hapticsStore.ts` pattern: parse → get → set → createStore with `subscribe`, `set`, `resetToDefault`.

### `soundVolume`

- Type: `number` (0–100)
- Default: `30`
- Storage key: `"sound-volume"`

### `soundMuted`

- Type: `boolean`
- Default: `false`
- Storage key: `"sound-muted"`

### `effectiveVolume()`

Exported helper: returns `soundMuted ? 0 : soundVolume / 100` (0–1 range for the engine).

## Sound Engine (`soundEngine.ts`)

### Module-level documentation

The file starts with a block comment explaining:
- How Web Audio synthesis works (oscillator → gain → master gain → destination)
- What each sound is trying to achieve sonically (character description from the sound design doc)
- How pitch helpers work and when to use each

### Lifecycle

- **Lazy AudioContext**: created on first `playSound()` call. No module-level side effects.
- **Master GainNode**: single shared node connected to `AudioContext.destination`. Volume controlled by `effectiveVolume()`.
- **Self-cleaning**: each sound creates short-lived oscillator/gain nodes that disconnect after their envelope completes.

### Pitch Helpers

#### `tierRelativePitch(level: number, maxLevel: number): number`

Computes position within current tier as a 0–1 ratio and maps to a pitch multiplier.

1. Get `tier = tierIndex(level, maxLevel)` and `upper = tierUpper(tier, maxLevel)`
2. Get previous tier upper: `lower = tierUpper(tier - 1, maxLevel)` (0 if tier ≤ 1)
3. Compute `t = (level - lower) / (upper - lower)` — position within tier (0 at tier start, 1 at tier upper)
4. Map to pitch range: `0.95 + t * 0.15` → multiplier from 0.95 to 1.10
5. Edge case: if `maxLevel ≤ 1` or `upper === lower`, return `1.0`

Resets low at each tier boundary start, rises toward tier upper. Gives a sense of progression within each tier.

#### `randomPitch(range: number = 0.06): number`

Returns `1 + (Math.random() * 2 - 1) * range` — random variation within a symmetric range around 1.0.

Used by: `level-down`, `tier-up`, `reset-confirm`. **Not** used by `level-up` (which uses `tierRelativePitch` exclusively).

### `playSound(id, opts?)` API

```ts
type SoundId = 'level-up' | 'level-down' | 'tier-up' | 'reset-confirm';

interface PlaySoundOptions {
    level?: number;    // current node level (used by level-up)
    maxLevel?: number; // node's max level (used by level-up)
}

function playSound(id: SoundId, opts?: PlaySoundOptions): void
```

- Checks `effectiveVolume()` — bails immediately if 0.
- Ensures AudioContext exists (lazy-creates on first call).
- Updates master gain to current `effectiveVolume()`.
- Calls the synthesis function for the given `id`.
- Fire-and-forget. No return value, no errors thrown.

### Tier 1 Sound Synthesis

Each synthesis function gets a block comment explaining the technique and target sound character.

#### `level-up` (~60–80ms)

Target: Soft mechanical click with tonal warmth. Tactile keyboard press meets glass tap.

- **Primary voice**: Triangle wave at ~800Hz base frequency. Fast attack (2ms ramp to peak), quick exponential decay to 0 over ~60ms.
- **Secondary voice**: Sine wave at 2× the primary frequency, ~40% of primary gain. Same envelope. Adds the "glass tap" harmonic quality.
- **Pitch**: Scaled by `tierRelativePitch(level, maxLevel)`. No random variation — tier position provides natural progression.
- **Duration**: ~60–80ms total. Nodes disconnect after decay.

#### `level-down` (~60–80ms)

Target: Same family as level-up but inverted — softer, lower pitch, tiny descending tail. Feels like "stepping back."

- **Primary voice**: Triangle wave at ~600Hz base frequency. Fast attack (2ms), exponential decay over ~70ms.
- **Secondary voice**: Sine at 2× frequency, ~30% of primary gain. Same envelope.
- **Pitch bend**: Tiny downward ramp (~600Hz → ~550Hz) over the decay — the "descending tail."
- **Pitch**: Scaled by `randomPitch()`.
- **Overall gain**: ~80% of level-up's gain. Softer presence.

#### `tier-up` (~100–120ms)

Target: Level-up's core click plus an added high crystalline partial. Slightly more "event" than a normal level change.

- **Core**: Same structure as level-up (triangle ~800Hz + sine harmonic).
- **Added partial**: Sine wave at ~2400Hz, ~25% of core gain, with its own envelope: 2ms attack, decay over ~100ms (lingers ~40ms longer than the core). This is the "crystalline step."
- **Pitch**: Core and partial both scaled by `randomPitch()`.
- **Duration**: ~100–120ms total (the high partial's longer tail).

#### `reset-confirm` (~200–250ms)

Target: Soft downward cascade — like scattering. Brief, not dramatic.

- **Cascade**: 3–4 sine oscillators fired in rapid succession, each staggered ~15ms apart.
- **Pitch descent**: Starting at ~700Hz, each subsequent voice drops ~100Hz (→ ~600Hz → ~500Hz → ~400Hz).
- **Per-voice envelope**: Fast attack (1ms), exponential decay over ~80ms each.
- **Per-voice gain**: Decreasing slightly with each voice (~100%, ~85%, ~70%, ~55% of base).
- **Pitch**: Each voice individually scaled by `randomPitch()`.
- **Duration**: ~200–250ms total (last voice starts at ~45ms, decays over ~80ms).

## Wiring & Trigger Points

### Level changes — `applyChange()` in `Tree.svelte`

After `updateLevels(nextLevels)` succeeds (line 679), before splash animation setup:

```
const prevTier = tierIndex(currentLevel, node.maxLevel);
const newLevel = getLevelFrom(nextLevels, index);
const newTier = tierIndex(newLevel, node.maxLevel);

if (newTier > prevTier && targetLevel > currentLevel) {
    playSound('tier-up');
} else if (targetLevel > currentLevel) {
    playSound('level-up', { level: newLevel, maxLevel: node.maxLevel });
} else {
    playSound('level-down');
}
```

`applyChange()` is the single entry point for all individual node level changes (increment by 1, by 10, by tier, decrement). No reset path calls `applyChange()`.

### Resets — `treeLevelsStore.ts`

Sound triggers at the data layer, inside the store functions. This means any UI that triggers a reset (quick settings, context menu, modal, undo toolbar) gets the sound automatically.

Each function checks whether levels actually changed (had non-zero values) before playing:

- **`resetTreeLevels()`** — plays `reset-confirm` if any level was > 0
- **`resetTreeBranchLevels()`** — plays `reset-confirm` if any branch level was > 0
- **`resetAllTreeLevels()`** — plays `reset-confirm` if any level across all trees was > 0

### No double-plays

The two sound trigger sites are completely independent:

- `applyChange()` handles individual level changes. Never called by reset paths.
- Store reset functions handle bulk zeroing. Never call `applyChange()`.

No chain of calls can trigger both sites.

### Intentionally silent

- Budget-blocked or cap-blocked increments (return false before `updateLevels`)
- No-ops (level already at min/max)
- Splash animations (visual only, independent of sound)

## Settings UI

### SliderSetting extension

New optional props on `SliderSetting.svelte`:

| Prop | Type | Purpose |
|---|---|---|
| `resetIcon` | `Component \| undefined` | When provided, renders an icon button in the header after the value badge |
| `resetAriaLabel` | `string \| undefined` | Accessible label for the reset button |
| `onReset` | `(() => void) \| undefined` | Callback fired when the reset button is clicked |

The button renders the `resetIcon` component. Only rendered when `resetIcon` is provided. Styled as a small, subtle inline icon button consistent with the header's visual weight.

### GeneralSettingsPage placement

Inside the "Accessibility" section, **above** the haptics toggle:

```
[SpeakerHigh icon]  Sound Effects   [30%]  [mute button]
                    Adjust volume
                    [====o========================] (0-100, step 10)

[Vibrate icon]      Haptic Feedback  [toggle]
                    Vibration on supported devices
```

- **Slider**: `min=0`, `max=100`, `step=10`, `defaultNotchIndex=3` (30%)
- **`formatValue`**: displays as `"${value}%"`
- **Value badge**: shows percentage when unmuted, "Muted" when muted
- **Mute button**: uses `resetIcon` with `SpeakerSlashIcon`/`SpeakerHighIcon`. Toggles `soundMuted` store. When muted, snaps slider display to 0; unmuting restores previous volume.
- **Icon**: `SpeakerHighIcon` when unmuted, `SpeakerSlashIcon` when muted (from phosphor-svelte)
- Both `soundVolume` and `soundMuted` stores added to `handleResetSettings()`

### Locale strings

New entries in all locale files under `settings.*`:

| Key | English |
|---|---|
| `settings.sound` | `"Sound Effects"` |
| `settings.soundDescription` | `"Adjust volume"` |
