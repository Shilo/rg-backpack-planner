<script lang="ts">
    import type { SVGAttributes } from 'svelte/elements';
    let props: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" {...props}>
    <path fill="currentColor" d="M11 15H6l7-14v8h5l-7 14z"/>
</svg>
