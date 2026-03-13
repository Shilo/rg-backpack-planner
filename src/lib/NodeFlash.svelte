<script lang="ts">
    export let level: number;
    export let isLeaf: boolean = false;
    export let isMaxed: boolean = false;

    let flashKey = 0;
    let prevLevel = level;
    let justMaxed = false;

    $: if (level !== prevLevel) {
        justMaxed = isMaxed && !justMaxed && level > prevLevel;
        prevLevel = level;
        flashKey++;
    }
</script>

{#key flashKey}
    {#if flashKey > 0}
        <span class="node-flash" class:node-flash-hex={isLeaf}></span>
        <span class="node-ring" class:node-ring-hex={isLeaf}></span>
        {#if justMaxed}
            <span class="node-ring node-ring-outer" class:node-ring-hex={isLeaf}></span>
        {/if}
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
        0% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    .node-ring {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        z-index: 3;
        border: 2px solid var(--node-flash-color);
        animation: node-ring-expand 400ms ease-out forwards;
    }

    .node-ring-hex {
        inset: var(--hex-border-width);
        border-radius: 0;
    }

    @keyframes node-ring-expand {
        0% {
            opacity: 0.7;
            inset: 0;
        }
        60% {
            opacity: 0.3;
            inset: -12px;
        }
        100% {
            opacity: 0;
            inset: -10px;
        }
    }

    .node-ring-outer {
        animation: node-ring-outer-expand 550ms ease-out 80ms forwards;
        opacity: 0;
    }

    @keyframes node-ring-outer-expand {
        0% {
            opacity: 0.5;
            inset: -2px;
        }
        50% {
            opacity: 0.25;
            inset: -20px;
        }
        100% {
            opacity: 0;
            inset: -18px;
        }
    }
</style>
