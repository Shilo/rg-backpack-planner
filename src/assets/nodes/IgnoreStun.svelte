<script module lang="ts">
    let nextSwirlCutMaskId = 0;
</script>

<script lang="ts">
    import type { SVGAttributes } from 'svelte/elements';

    const swirlCutMaskId = `ignore-stun-swirl-cut-${++nextSwirlCutMaskId}`;
    let props: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="31 42 192 166" preserveAspectRatio="xMidYMid meet" {...props}>
    <defs>
        <mask
            id={swirlCutMaskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="256"
            height="256"
        >
            <rect width="256" height="256" fill="white" />
            <line
                x1="55"
                y1="62"
                x2="196"
                y2="203"
                stroke="black"
                stroke-width="46"
                stroke-linecap="round"
            />
        </mask>
    </defs>
    <path
        fill="currentColor"
        mask={`url(#${swirlCutMaskId})`}
        d="M223 143a10 10 0 0 1-20 0a80 80 0 0 0-80-80a70 70 0 0 0-70 70a60 60 0 0 0 60 60a50 50 0 0 0 50-50a40 40 0 0 0-40-40a30 30 0 0 0-30 30a20 20 0 0 0 20 20a10 10 0 0 0 10-10a10 10 0 0 1 0-20a20 20 0 0 1 20 20a30 30 0 0 1-30 30a40 40 0 0 1-40-40a50 50 0 0 1 50-50a60 60 0 0 1 60 60a70 70 0 0 1-70 70a80 80 0 0 1-80-80a90 90 0 0 1 90-90a100 100 0 0 1 100 100"
    />
    <line
        x1="55"
        y1="62"
        x2="196"
        y2="203"
        fill="none"
        stroke="currentColor"
        stroke-width="16"
        stroke-linecap="round"
    />
</svg>
