<script lang="ts">
    export let value: number = 0;
    export let maxLevel: number = 0;

    $: clampedValue = Math.max(0, Math.min(1, value));

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
</script>

<div
    class="progress"
    style={tickImage ? `--tick-gradient:${tickImage}` : ""}
>
    <div
        class="progress-fill"
        style={`transform: scaleX(${clampedValue})`}
    ></div>
    {#if tickImage}
        <div class="progress-ticks"></div>
    {/if}
</div>

<style>
    .progress {
        width: 100%;
        height: 8px;
        background: var(--bg-raised);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
        clip-path: inset(0 round 4px);
    }

    .progress-fill {
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-light));
        transform-origin: left;
        transition: transform var(--ease);
        border-radius: 0;
    }

    .progress-ticks {
        position: absolute;
        inset: 0;
        background-image: var(--tick-gradient, none);
        pointer-events: none;
    }
</style>
