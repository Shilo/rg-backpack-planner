<script lang="ts">
    import { tick } from "svelte";

    export let value: number = 0;
    export let maxLevel: number = 0;

    $: clampedValue = Math.max(0, Math.min(1, value));
    $: isFull = clampedValue >= 1;

    // Track when the bar transitions to full for the celebration pulse
    let fullKey = 0;
    let prevFull = false;
    $: {
        const nowFull = isFull;
        if (nowFull && !prevFull) {
            fullKey++;
        }
        prevFull = nowFull;
    }

    const tickGradient = (max: number) => {
        if (max <= 1) return "";
        const size = Math.ceil(max / 5);
        const positions = [1, 2, 3, 4].map((t) => (t * size * 100) / max);
        const thickness = "2px";
        const color = "var(--bg-panel)";
        return positions
            .map(
                (p) =>
                    `linear-gradient(90deg, transparent calc(${p}% - ${thickness}), ${color} calc(${p}% - ${thickness}), ${color} calc(${p}% + ${thickness}), transparent calc(${p}% + ${thickness}))`,
            )
            .join(", ");
    };

    $: tickImage = tickGradient(maxLevel);

    let shimmer = false;
    let prevValue = value;
    $: if (value !== prevValue) {
        prevValue = value;
        triggerShimmer();
    }

    async function triggerShimmer() {
        shimmer = false;
        await tick();
        shimmer = true;
    }

    function onShimmerEnd() {
        shimmer = false;
    }
</script>

<div
    class="progress"
    class:progress--full={isFull}
    style={tickImage ? `--tick-gradient:${tickImage}` : ""}
>
    <div
        class="progress-fill"
        class:shimmer
        style={`transform: scaleX(${clampedValue})`}
        on:animationend={onShimmerEnd}
    ></div>
    {#if tickImage}
        <div class="progress-ticks"></div>
    {/if}
    {#key fullKey}
        {#if fullKey > 0}
            <span class="progress-full-flash"></span>
        {/if}
    {/key}
</div>

<style>
    .progress {
        width: 100%;
        height: 8px;
        background: var(--bg-raised);
        border-radius: var(--radius-full);
        overflow: hidden;
        position: relative;
        clip-path: inset(0 round var(--radius-full));
    }

    .progress-fill {
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-light));
        transform-origin: left;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        border-radius: 0;
        position: relative;
        overflow: hidden;
    }

    .progress-fill::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in srgb, white 30%, transparent) 50%,
            transparent 100%
        );
        opacity: 0;
        transform: translateX(-100%);
        pointer-events: none;
    }

    .progress-fill.shimmer::after {
        animation: progress-shimmer 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes progress-shimmer {
        0% {
            opacity: 1;
            transform: translateX(-100%);
        }
        100% {
            opacity: 0;
            transform: translateX(100%);
        }
    }

    .progress-ticks {
        position: absolute;
        inset: 0;
        background-image: var(--tick-gradient, none);
        pointer-events: none;
    }

    .progress-full-flash {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, var(--accent-light), transparent);
        pointer-events: none;
        animation: progress-flash-sweep 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes progress-flash-sweep {
        0% {
            opacity: 0.8;
            transform: translateX(-100%);
        }
        60% {
            opacity: 0.4;
        }
        100% {
            opacity: 0;
            transform: translateX(100%);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .progress-fill {
            transition: none;
        }

        .progress-full-flash {
            animation: none;
            display: none;
        }
    }
</style>
