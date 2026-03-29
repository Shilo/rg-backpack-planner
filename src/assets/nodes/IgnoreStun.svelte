<script module lang="ts">
    let nextSwirlCutMaskId = 0;
</script>

<script lang="ts">
    import type { SVGAttributes } from 'svelte/elements';

    const swirlCutMaskId = `ignore-stun-swirl-cut-${++nextSwirlCutMaskId}`;
    let props: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" {...props}>
    <defs>
        <mask
            id={swirlCutMaskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="400"
            height="400"
        >
            <rect width="400" height="400" fill="white" />
            <line
                x1="50"
                y1="50"
                x2="350"
                y2="350"
                stroke="black"
                stroke-width="48"
                stroke-linecap="round"
            />
        </mask>
    </defs>
    <path
        fill="currentColor"
        mask={`url(#${swirlCutMaskId})`}
        d="M244 200 C244 175.7 232 142 200 142 C168 142 128 160.2 128 200 C128 239.8 152.5 286 200 286 C247.5 286 300 255.2 300 200 C300 144.8 263 86 200 86 C137 86 72 129.3 72 200 C72 270.7 121.6 342 200 342 C278.4 342 356 286.2 356 200 C356 113.8 293.9 30 200 30 C106.1 30 16 98.4 16 200 A14 14 0 0 0 44 200 C44 113.8 121.6 58 200 58 C278.4 58 328 129.3 328 200 C328 270.7 263 314 200 314 C137 314 100 255.2 100 200 C100 144.8 152.5 114 200 114 C247.5 114 272 160.2 272 200 C272 239.8 232 258 200 258 C168 258 156 224.3 156 200 C156 175.7 183.4 170 200 170 C216.6 170 216 191.2 216 200 A14 14 0 0 0 244 200Z"
    />
    <line
        x1="50"
        y1="50"
        x2="350"
        y2="350"
        fill="none"
        stroke="currentColor"
        stroke-width="28"
        stroke-linecap="round"
    />
</svg>
