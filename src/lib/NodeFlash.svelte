<script lang="ts">
    export let level: number;
    export let isLeaf: boolean = false;

    let flashKey = 0;
    let prevLevel = level;

    $: if (level !== prevLevel) {
        prevLevel = level;
        flashKey++;
    }
</script>

{#key flashKey}
    {#if flashKey > 0}
        <span class="node-flash" class:node-flash-hex={isLeaf}></span>
    {/if}
{/key}

<style>
    .node-flash {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        z-index: 3;
        background: var(--node-flash-color);
        animation: node-flash 250ms ease-out forwards;
    }

    .node-flash-hex {
        inset: var(--hex-border-width);
        border-radius: 0;
    }

    @keyframes node-flash {
        0% { opacity: 1; }
        100% { opacity: 0; }
    }
</style>
