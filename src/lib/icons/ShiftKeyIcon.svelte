<script lang="ts">
    export let size: number | string | undefined = undefined;
</script>

<svg {...$$restProps} width={size} height={size} viewBox="0 0 256 256" fill="none">
    <rect x="32" y="32" width="192" height="192" rx="24"
        stroke="currentColor" stroke-width="14" />
    <path d="M128 82 L174 134 H152 V174 H104 V134 H82 Z"
        fill="currentColor" />
</svg>

<style>
    svg {
        display: block;
    }
</style>
