<script lang="ts">
    import type { SVGAttributes } from 'svelte/elements';
    let props: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" {...props}>
    <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5z"/>
    <g fill="currentColor" transform="translate(12 11.25) scale(0.34) translate(-11.5 -8)">
        <path d="M11 15H6l7-14v8h5l-7 14z"/>
    </g>
</svg>
