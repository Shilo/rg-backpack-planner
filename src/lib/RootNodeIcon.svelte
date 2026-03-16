<script lang="ts">
    export let size: number | string | undefined = undefined;
</script>

<svg {...$$restProps} width={size} height={size} viewBox="0 0 44 44" fill="none">
    <path
        d="M 22 2.5 C 27 2.5 25.46 8.41 28.75 10.31 C 32.04 12.21 36.39 7.92 38.89 12.25 C 41.39 16.58 35.5 18.2 35.5 22 C 35.5 25.8 41.39 27.42 38.89 31.75 C 36.39 36.08 32.04 31.79 28.75 33.69 C 25.46 35.59 27 41.5 22 41.5 C 17 41.5 18.54 35.59 15.25 33.69 C 11.96 31.79 7.61 36.08 5.11 31.75 C 2.61 27.42 8.5 25.8 8.5 22 C 8.5 18.2 2.61 16.58 5.11 12.25 C 7.61 7.92 11.96 12.21 15.25 10.31 C 18.54 8.41 17 2.5 22 2.5 Z"
    />
</svg>

<style>
    svg {
        display: block;
        overflow: visible;
    }

    path {
        fill: var(--root-gear-fill, currentColor);
        stroke: var(--root-gear-stroke, currentColor);
        stroke-width: var(--root-gear-stroke-width, 3);
        stroke-linejoin: round;
    }
</style>
