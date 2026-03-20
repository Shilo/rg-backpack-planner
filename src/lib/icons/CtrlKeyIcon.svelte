<script lang="ts">
    export let size: number | string | undefined = undefined;
</script>

<svg {...$$restProps} width={size} height={size} viewBox="0 0 256 256" fill="none">
    <rect x="32" y="32" width="192" height="192" rx="24"
        stroke="currentColor" stroke-width="14" />
    <path d="M84 154 L128 106 L172 154"
        stroke="currentColor" stroke-width="20"
        stroke-linecap="round" stroke-linejoin="round" />
</svg>

<style>
    svg {
        display: block;
    }
</style>
