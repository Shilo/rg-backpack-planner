/**
 * Sound Engine — Web Audio API Synthesis
 *
 * Signal chain: oscillator(s) → per-voice GainNode → master GainNode → AudioContext.destination
 *
 * Each sound creates short-lived oscillator and gain nodes. Oscillators generate
 * waveforms (sine, triangle) at specific frequencies, shaped by gain envelopes
 * (fast attack, exponential decay) to produce percussive, tonal clicks. After the
 * envelope completes, nodes are stopped and disconnected via setTimeout.
 *
 * Sound characters:
 *   level-up    — Soft mechanical click with tonal warmth. Tactile keyboard press
 *                 meets glass tap. Pitch rises with progress through the current tier.
 *   level-down  — Same family as level-up but inverted: softer, lower pitch, tiny
 *                 descending frequency tail. Feels like "stepping back."
 *   tier-max    — Quick ascending arpeggio — a "collect" or "tier complete" sound.
 *                 Three-note major triad with shimmer. Plays when a tier is maxed.
 *   reset-confirm — Soft downward cascade of 4 sine tones fired in rapid succession.
 *                   Like scattering. Brief, not dramatic.
 *
 * Pitch helpers:
 *   tierRelativePitch(level, maxLevel) — Deterministic pitch multiplier (0.95–1.10)
 *       based on the node's position within its current tier. Used by level-up so
 *       successive clicks rise in pitch across a tier, then reset at the next tier.
 *   randomPitch(range) — Small random pitch variation (default ±0.06) around 1.0.
 *       Used by level-down, tier-up, and reset-confirm for organic variation.
 *       NOT used by level-up (which uses tierRelativePitch instead).
 */

import type { Node } from "../types/tree";
import { effectiveVolume } from "./soundStore";
import { tierIndex, tierUpper } from "./tierLeveling";

// --- Module-level AudioContext (lazy-created on first playSound call) ---

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// --- Pitch Helpers ---

/**
 * Deterministic pitch multiplier based on position within the current tier.
 * Returns a value from 0.95 (tier start) to 1.10 (tier upper), so successive
 * level-ups within a tier produce a rising pitch.
 */
export function tierRelativePitch(
    level: number,
    maxLevel: Node["maxLevel"],
): number {
    if (maxLevel <= 1) return 1.0;

    const tier = tierIndex(level, maxLevel);
    const upper = tierUpper(tier, maxLevel);
    const lower = tier <= 1 ? 0 : tierUpper(tier - 1, maxLevel);

    if (upper === lower) return 1.0;

    const t = (level - lower) / (upper - lower);
    return 0.95 + t * 0.15;
}

/**
 * Random pitch multiplier within a symmetric range around 1.0.
 * Default range ±0.06 produces values from 0.94 to 1.06.
 */
export function randomPitch(range: number = 0.06): number {
    return 1 + (Math.random() * 2 - 1) * range;
}

// --- Sound Types ---

export type SoundId = "level-up" | "level-down" | "tier-max" | "reset-confirm";

export interface PlaySoundOptions {
    level?: number;
    maxLevel?: Node["maxLevel"];
}

// --- Synthesis Functions ---

/**
 * synthLevelUp (~60–80ms)
 *
 * Soft mechanical click with tonal warmth. Triangle wave at ~800Hz provides the
 * body; a sine harmonic at 2× adds "glass tap" quality. Fast 2ms attack into
 * exponential decay. Pitch determined by tier position (no randomness).
 */
function synthLevelUp(
    ac: AudioContext,
    master: GainNode,
    opts?: PlaySoundOptions,
): void {
    const now = ac.currentTime;
    const level = opts?.level ?? 1;
    const maxLevel = opts?.maxLevel ?? 1;
    const pitch = tierRelativePitch(level, maxLevel);

    const BASE_FREQ = 680;
    const PRIMARY_PEAK = 0.22; // Combined peak: 0.29 (0.22 + 0.07) — mix level handles balancing
    const SECONDARY_PEAK = 0.07;
    const ATTACK = 0.002;
    const DECAY_END = 0.06;
    const NEAR_ZERO = 0.001;

    // Primary voice — triangle at base frequency
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.type = "triangle";
    osc1.frequency.value = BASE_FREQ * pitch;
    gain1.gain.setValueAtTime(NEAR_ZERO, now);
    gain1.gain.linearRampToValueAtTime(PRIMARY_PEAK, now + ATTACK);
    gain1.gain.exponentialRampToValueAtTime(
        NEAR_ZERO,
        now + ATTACK + DECAY_END,
    );
    osc1.connect(gain1);
    gain1.connect(master);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Secondary voice — sine at 2× frequency for glass-tap harmonic
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.value = BASE_FREQ * 2 * pitch;
    gain2.gain.setValueAtTime(NEAR_ZERO, now);
    gain2.gain.linearRampToValueAtTime(SECONDARY_PEAK, now + ATTACK);
    gain2.gain.exponentialRampToValueAtTime(
        NEAR_ZERO,
        now + ATTACK + DECAY_END,
    );
    osc2.connect(gain2);
    gain2.connect(master);
    osc2.start(now);
    osc2.stop(now + 0.08);

    // Cleanup after sound completes
    setTimeout(() => {
        gain1.disconnect();
        gain2.disconnect();
    }, 100);
}

/**
 * synthLevelDown (~60–80ms)
 *
 * Same family as level-up but inverted — softer, lower pitch, tiny descending
 * frequency tail. Triangle at ~600Hz ramping down to ~550Hz over the decay.
 * Sine harmonic at 2× with 30% of primary gain. Random pitch variation.
 */
function synthLevelDown(ac: AudioContext, master: GainNode): void {
    const now = ac.currentTime;
    const pitch = randomPitch();

    const BASE_FREQ = 600;
    const FREQ_END = 550;
    const PRIMARY_PEAK = 0.204; // Combined peak: 0.264 (0.204 + 0.06) — mix level handles balancing
    const SECONDARY_PEAK = 0.06;
    const ATTACK = 0.002;
    const DECAY_END = 0.07;
    const NEAR_ZERO = 0.001;

    // Primary voice — triangle with descending pitch bend
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(BASE_FREQ * pitch, now);
    osc1.frequency.linearRampToValueAtTime(
        FREQ_END * pitch,
        now + ATTACK + DECAY_END,
    );
    gain1.gain.setValueAtTime(NEAR_ZERO, now);
    gain1.gain.linearRampToValueAtTime(PRIMARY_PEAK, now + ATTACK);
    gain1.gain.exponentialRampToValueAtTime(
        NEAR_ZERO,
        now + ATTACK + DECAY_END,
    );
    osc1.connect(gain1);
    gain1.connect(master);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Secondary voice — sine at 2× frequency
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.value = BASE_FREQ * 2 * pitch;
    gain2.gain.setValueAtTime(NEAR_ZERO, now);
    gain2.gain.linearRampToValueAtTime(SECONDARY_PEAK, now + ATTACK);
    gain2.gain.exponentialRampToValueAtTime(
        NEAR_ZERO,
        now + ATTACK + DECAY_END,
    );
    osc2.connect(gain2);
    gain2.connect(master);
    osc2.start(now);
    osc2.stop(now + 0.08);

    setTimeout(() => {
        gain1.disconnect();
        gain2.disconnect();
    }, 100);
}

/**
 * synthTierMax (~150–200ms)
 *
 * Quick ascending arpeggio — a "collect" or "tier complete" sound. Three sine
 * tones at roughly a major triad (root, major third, fifth) fired in rapid
 * succession, each staggered ~30ms apart. Each note has a fast attack and
 * medium decay with a shimmer overlay (quiet high partial on the last note).
 * Feels like picking up coins or completing a tier checkpoint.
 * Distinctly different from level-up's single mechanical click.
 */
function synthTierMax(ac: AudioContext, master: GainNode): void {
    const pitch = randomPitch();

    // Major triad arpeggio: root (C5 ~523Hz), major third (E5 ~659Hz), fifth (G5 ~784Hz)
    const FREQS = [523, 659, 784];
    const DELAYS = [0, 30, 60];
    const GAINS = [0.24, 0.216, 0.264]; // Staggered, peak per-voice ~0.264; shimmer adds 0.072
    const ATTACK = 0.002;
    const DECAY = 0.1;
    const NEAR_ZERO = 0.001;

    // Arpeggio — three ascending sine tones
    FREQS.forEach((freq, i) => {
        setTimeout(() => {
            const now = ac.currentTime;
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = "sine";
            osc.frequency.value = freq * pitch;
            gain.gain.setValueAtTime(NEAR_ZERO, now);
            gain.gain.linearRampToValueAtTime(GAINS[i], now + ATTACK);
            gain.gain.exponentialRampToValueAtTime(
                NEAR_ZERO,
                now + ATTACK + DECAY,
            );
            osc.connect(gain);
            gain.connect(master);
            osc.start(now);
            osc.stop(now + ATTACK + DECAY + 0.01);

            setTimeout(() => {
                gain.disconnect();
            }, 130);
        }, DELAYS[i]);
    });

    // Shimmer — quiet high partial on the last note for sparkle
    setTimeout(() => {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.value = FREQS[2] * 2 * pitch;
        gain.gain.setValueAtTime(NEAR_ZERO, now);
        gain.gain.linearRampToValueAtTime(0.072, now + ATTACK);
        gain.gain.exponentialRampToValueAtTime(NEAR_ZERO, now + ATTACK + 0.12);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + ATTACK + 0.12 + 0.01);

        setTimeout(() => {
            gain.disconnect();
        }, 160);
    }, DELAYS[2]);
}

/**
 * synthResetConfirm (~200–250ms)
 *
 * Soft downward cascade — 4 sine oscillators fired in rapid succession with
 * staggered delays (0, 15, 30, 45ms). Pitch descends from ~700Hz by ~100Hz
 * per voice. Each voice has its own fast-attack/exponential-decay envelope
 * with decreasing gain. Like scattering. Brief, not dramatic.
 */
function synthResetConfirm(ac: AudioContext, master: GainNode): void {
    const FREQS = [700, 600, 500, 400];
    const GAINS = [0.2, 0.17, 0.14, 0.11]; // Staggered, peak per-voice ~0.2; voices overlap briefly
    const DELAYS = [0, 15, 30, 45];
    const ATTACK = 0.001;
    const DECAY = 0.08;
    const NEAR_ZERO = 0.001;

    FREQS.forEach((freq, i) => {
        setTimeout(() => {
            const now = ac.currentTime;
            const pitch = randomPitch();

            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = "sine";
            osc.frequency.value = freq * pitch;
            gain.gain.setValueAtTime(NEAR_ZERO, now);
            gain.gain.linearRampToValueAtTime(GAINS[i], now + ATTACK);
            gain.gain.exponentialRampToValueAtTime(
                NEAR_ZERO,
                now + ATTACK + DECAY,
            );
            osc.connect(gain);
            gain.connect(master);
            osc.start(now);
            osc.stop(now + ATTACK + DECAY + 0.01);

            setTimeout(() => {
                gain.disconnect();
            }, 100);
        }, DELAYS[i]);
    });
}

// --- Dispatch Map ---

const SYNTH_MAP: Record<
    SoundId,
    (ac: AudioContext, master: GainNode, opts?: PlaySoundOptions) => void
> = {
    "level-up": synthLevelUp,
    "level-down": synthLevelDown,
    "tier-max": synthTierMax,
    "reset-confirm": synthResetConfirm,
};

/**
 * Per-sound mix levels for perceived loudness normalization.
 *
 * Gain values alone don't determine perceived loudness — frequency, waveform,
 * duration, and voice count all affect it. These scalars compensate so all
 * sounds feel equally present at the same volume setting. Tune these by ear,
 * not by matching gain numbers.
 */
const MIX_LEVELS: Record<SoundId, number> = {
    "level-up": 1.0,
    "level-down": 1.0,
    "tier-max": 1.0,
    "reset-confirm": 1.0,
};

// --- Public API ---

/**
 * Play a sound by id. Fire-and-forget — never throws, silently fails.
 *
 * Lazily creates the AudioContext and master gain on first call.
 * Resumes the context if suspended (browser autoplay policy).
 * Bails immediately if effectiveVolume() is 0.
 */
export function playSound(id: SoundId, opts?: PlaySoundOptions): void {
    try {
        const vol = effectiveVolume();
        if (vol === 0) return;

        // Lazy-create AudioContext and master gain
        if (!ctx) {
            ctx = new AudioContext();
            masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
        }

        // Resume if suspended (browser autoplay policy).
        // Skip this sound — next user gesture will play normally.
        if (ctx.state === "suspended") {
            void ctx.resume();
            return;
        }

        // Apply user volume × per-sound mix level
        masterGain!.gain.setValueAtTime(vol * MIX_LEVELS[id], ctx.currentTime);

        // Dispatch to synthesis function
        const synth = SYNTH_MAP[id];
        synth(ctx, masterGain!, opts);
    } catch {
        // Silently fail — sound is non-critical
    }
}
