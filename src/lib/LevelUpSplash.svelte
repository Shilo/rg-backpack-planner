<script lang="ts">
    import { onMount } from "svelte";
    import { formatNumber } from "./mathUtil";

    export let x: number;
    export let y: number;
    export let level: number;
    export let isUp: boolean;
    export let crystalDelta: number;
    export let scale: number = 1;
    export let skipEntry: boolean = false;
    export let onDone: (() => void) | null = null;

    const DURATION_MS = 1200;
    const ARROW_UP = "\u25B2";
    const ARROW_DOWN = "\u25BC";
    const HEXAGON = "\u2B22";

    let el: HTMLDivElement;
    let nudgeX = 0;
    let nudgeY = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let animKey = 0;

    $: lvlText = "Lv " + formatNumber(level);
    $: cSign = crystalDelta > 0 ? "+" : crystalDelta < 0 ? "\u2212" : "";
    $: cText = cSign + formatNumber(Math.abs(crystalDelta));
    $: levelColor = isUp ? "var(--accent-light)" : "var(--accent-danger)";
    $: crystalColor = isUp ? "var(--accent-danger)" : "var(--success-text)";
    $: badgeScale = Math.max(1 / scale, 1);

    let prevLevel = level;
    let prevCrystalDelta = crystalDelta;
    $: if (level !== prevLevel || crystalDelta !== prevCrystalDelta) {
        prevLevel = level;
        prevCrystalDelta = crystalDelta;
        animKey++;
        restartTimer();
    }

    function restartTimer() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => onDone?.(), DURATION_MS);
    }

    onMount(() => {
        if (el) {
            const rect = el.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const hud = document.querySelector(".hud-safe-area");
            const hudRect = hud?.getBoundingClientRect();
            const insetTop = hudRect?.top ?? 0;
            const insetRight = hudRect ? vw - hudRect.right : 0;
            const insetBottom = hudRect ? vh - hudRect.bottom : 0;
            const insetLeft = hudRect?.left ?? 0;
            if (rect.left < insetLeft) {
                nudgeX = (insetLeft - rect.left) / scale;
            } else if (rect.right > vw - insetRight) {
                nudgeX = (vw - insetRight - rect.right) / scale;
            }
            if (rect.top < insetTop) {
                nudgeY = (insetTop - rect.top) / scale;
            } else if (rect.bottom > vh - insetBottom) {
                nudgeY = (vh - insetBottom - rect.bottom) / scale;
            }
        }
        restartTimer();
        return () => {
            if (timer) clearTimeout(timer);
        };
    });
</script>

<div
    bind:this={el}
    class="level-splash"
    style="left: {x + nudgeX}px; top: {y - 48 * badgeScale + nudgeY}px; --badge-scale: {badgeScale};"
    aria-live="polite"
>
    {#key animKey}
    <div class="level-splash__anim" class:level-splash__anim--update={animKey > 0 || skipEntry}>
        <div class="level-splash__pill">
            <span class="level-splash__segment" style="color: {levelColor}">
                <span class="level-splash__icon">{isUp ? ARROW_UP : ARROW_DOWN}</span>
                <span>{lvlText}</span>
            </span>
            <span class="level-splash__divider"></span>
            <span class="level-splash__segment" style="color: {crystalColor}">
                <span class="level-splash__icon">{HEXAGON}</span>
                <span>{cText}</span>
            </span>
        </div>
    </div>
    {/key}
</div>

<style>
    .level-splash {
        position: absolute;
        transform: translate(-50%, -100%) scale(var(--badge-scale, 1));
        pointer-events: none;
        z-index: 10;
    }

    .level-splash__anim {
        animation: splash-float 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .level-splash__anim--update {
        animation-name: splash-update;
    }

    .level-splash__pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 6px 16px;
        border-radius: var(--radius-full);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        box-shadow: var(--shadow);
        font-size: var(--font-lg);
        font-weight: var(--weight-bold);
        letter-spacing: var(--tracking);
        line-height: var(--leading-none);
        white-space: nowrap;
    }

    .level-splash__segment {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .level-splash__icon {
        font-size: 0.75em;
    }

    .level-splash__divider {
        width: 1px;
        height: 14px;
        background: var(--border-subtle);
        flex-shrink: 0;
    }

    @keyframes splash-float {
        0% { opacity: 0; transform: scale(0.85) translateY(4px); }
        15% { opacity: 1; transform: scale(1.02) translateY(0); }
        25% { transform: scale(1) translateY(0); }
        65% { opacity: 1; transform: scale(1) translateY(0); }
        100% { opacity: 0; transform: scale(0.97) translateY(-12px); }
    }

    @keyframes splash-update {
        0%, 65% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.97) translateY(-12px); }
    }

    @media (prefers-reduced-motion: reduce) {
        .level-splash__anim {
            animation: splash-fade 0.8s ease forwards;
        }

        .level-splash__anim--update {
            animation-name: splash-fade-update;
        }

        @keyframes splash-fade {
            0% { opacity: 0; }
            20% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }

        @keyframes splash-fade-update {
            0%, 70% { opacity: 1; }
            100% { opacity: 0; }
        }
    }
</style>
