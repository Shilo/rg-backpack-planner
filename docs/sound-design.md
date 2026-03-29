# Sound Design

UI sound effects for the backpack planner. Sounds reinforce the core interaction loop (node leveling) and key state changes without cluttering routine navigation.

## Principles

- **Sound as information** — every sound communicates a state change. No ambient loops, hover sounds, or gratuitous flourishes.
- **On by default** — sounds ship enabled. Volume slider + mute button in settings give instant control.
- **Variation over repetition** — core sounds (node tap) have 2-4 pitch/timing variants to prevent fatigue during rapid clicking.
- **Complementary** — sounds work alongside haptics and visuals. Sound and haptic settings are independent toggles.
- **Mixed quiet** — default volume ~30%. Sounds should be barely noticed until turned off.
- **Lazy initialized** — AudioContext created on first user gesture. Zero impact on initial load.
- **Tiny footprint** — PWA constraint. Synthesis-first approach means zero audio file downloads. No files to cache, no bandwidth cost.

### Anti-Patterns

- Cartoonish or retro 8-bit (this is a precision tool, not a retro game)
- Notification-style alert tones (the sounds should feel in-app, not like a system ping)
- Musical notes or melodies (too much personality, ages fast)
- Long tails or reverb (core sounds must be snappy, under 200ms)
- Sounds on every interaction (most buttons, toggles, tabs stay silent)

## Sound Inventory

### Tier 1 — Core

Ship these first. If you only do 4 sounds, do these.

| ID | Trigger | Character | Duration | Notes |
|---|---|---|---|---|
| `level-up` | Level increases | Soft mechanical click with tonal warmth. Tactile keyboard press meets glass tap. | ~60-80ms | 3-4 pitch variants, randomized. Pitch rises subtly as node level increases. |
| `level-down` | Level decreases | Same family as level-up but inverted — softer, lower pitch, tiny descending tail. | ~60-80ms | Feels like "stepping back" without feeling negative. |
| `tier-up` | Level crosses a tier boundary upward | Subtle crystalline step-up — level-up with an added high partial. Slightly more "event" than a normal level change. | ~100-120ms | Upward only. Downward tier crosses use normal `level-down`. |
| `reset-confirm` | Branch or tree reset is confirmed (all nodes zeroed) | Soft downward cascade — like scattering. Brief, not dramatic. | ~200-250ms | Plays when the reset executes, not on the button press or modal open. |

### Tier 2 — Polish

Add after Tier 1 is validated and feels good.

| ID | Trigger | Character | Duration | Notes |
|---|---|---|---|---|
| `toast-positive` | Important success toast (save, share, clone) | Tiny ascending two-note blip. Almost subliminal. | ~80ms | Very quiet. Most toasts stay silent — only milestone toasts get sound. |
| `toast-negative` | Error toast | Same two-note but with slight dissonance/buzz. | ~80ms | Distinct from positive but same family. |
| `modal-open` | Any modal opens | Extremely subtle "air" — whisper of highpassed white noise. | ~60ms | Test whether this adds or distracts. Cut if uncertain. |
| `undo-redo` | History navigation | Muted version of level-up, pitched down. | ~50ms | Lightweight — these are frequent and mechanical. |

### Tier 3 — Delight

Only if Tier 1-2 feel great and the system is proven.

| ID | Trigger | Character | Duration | Notes |
|---|---|---|---|---|
| `tree-maxed` | All nodes in a tree hit max | A brief completion chime — harmonic shimmer with one extra beat. A moment. | ~300-400ms | Rare event. Should feel earned. The one sound allowed a touch of drama. |
| `build-loaded` | Build imported/loaded from URL | Soft "materialization" — quick whoosh-in mirroring the visual. | ~120ms | Only on explicit load, not on page load with existing build. |
| `screenshot` | Screenshot exported | Camera-shutter-like click. | ~100ms | Universally understood. |

### Intentionally Silent

| Interaction | Reasoning |
|---|---|
| Generic button press | Too frequent. Haptics + visual scale are sufficient. |
| Toggle switches | The thumb animation is the feedback. |
| Tab switching | Navigation is silent in quality apps (Linear, Raycast). |
| Accordion open/close | The expand animation communicates state. |
| Hover | Never. |
| Menu open/close | Visual transition is sufficient. |
| Keyboard shortcut activation | The triggered action has its own sound. |
| Drag/pan/zoom | Continuous gestures must never have sound. |

## Settings UI

Located in Settings > General, independent from the Haptics toggle.

```
Sound Effects          [slider =========o===] [mute button]
```

- **Slider**: 0-100% volume. Default 30%.
- **Mute button**: Instantly snaps to 0 / restores previous volume. Icon toggles between speaker and speaker-off.
- Both values persisted to localStorage.

## Architecture

```
src/lib/
  soundEngine.ts     — AudioContext setup, lazy loading, play API, volume control
  soundStore.ts      — soundEnabled, soundVolume state, persisted
```

### Synthesis-First Approach

All sounds are generated at runtime using the Web Audio API — no audio files to download.

1. `AudioContext` is created lazily on the first user gesture (browser requirement).
2. Each sound ID maps to a synthesis function that builds an oscillator/gain chain with specific frequency, envelope, and harmonic parameters.
3. `playSound('level-up')` constructs and plays the sound immediately. No fetching, no decoding.
4. Pitch variation is built in — parameters are randomized within defined ranges per call.

```ts
// Conceptual API
playSound('level-up')                    // fire-and-forget, auto-varied
playSound('level-up', { pitch: 1.05 })   // explicit pitch override
```

**Synthesis is well-suited for the core sounds** — short clicks, taps, and blips are precisely what oscillator + envelope shaping produces cleanly. These sounds are simple waveforms with fast attack/decay, not complex textures.

**If a sound doesn't meet the quality bar after tuning**, replace that individual sound with a sourced audio file. The engine supports both — synthesis is the default, files are the fallback. Likely candidates for fallback: `tier-up` (crystalline shimmer is harder to synthesize) and `reset-confirm` (cascade/scatter effect).

## Rollout

1. Build `soundEngine.ts` + `soundStore.ts` with synthesis functions for `level-up` and `level-down`.
2. Wire into node interaction handlers. Listen and tune parameters until the sounds feel right.
3. Add `tier-up` and `reset-confirm` synthesis. If either sounds weak, swap to a sourced file.
4. Add settings UI (slider + mute).
5. Playtest a full planning session. Tune volumes, timing, pitch ranges.
6. Ship Tier 1. Gather feedback.
7. Add Tier 2, then Tier 3 based on reception.
