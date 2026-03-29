<script module lang="ts">
    let nextSwirlCutMaskId = 0;
</script>

<script lang="ts">
    import type { SVGAttributes } from 'svelte/elements';

    const swirlCutMaskId = `ignore-stun-swirl-cut-${++nextSwirlCutMaskId}`;
    let props: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" {...props}>
    <defs>
        <mask
            id={swirlCutMaskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="24"
            height="24"
        >
            <rect width="24" height="24" fill="white" />
            <line
                x1="2.25"
                y1="2.25"
                x2="21.75"
                y2="21.75"
                stroke="black"
                stroke-width="4.35"
                stroke-linecap="round"
            />
        </mask>
    </defs>
    <path
        fill="currentColor"
        mask={`url(#${swirlCutMaskId})`}
        d="M15 6.79c1.86 1.07 3 3.06 3 5.21C18 22 6 22 6 22c1.25-.94 2.38-2.05 3.34-3.29a.99.99 0 0 0-.34-1.5C7.14 16.14 6 14.15 6 12C6 2 18 2 18 2c-1.25.94-2.38 2.05-3.34 3.29a.99.99 0 0 0 .34 1.5M12 14a2 2 0 0 0 2-2a2 2 0 0 0-2-2a2 2 0 0 0-2 2a2 2 0 0 0 2 2"
    />
    <line
        x1="2.25"
        y1="2.25"
        x2="21.75"
        y2="21.75"
        fill="none"
        stroke="currentColor"
        stroke-width="2.85"
        stroke-linecap="round"
    />
</svg>
