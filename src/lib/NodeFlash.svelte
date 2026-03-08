<script lang="ts">
    export let level: number;
    export let isLeaf: boolean = false;

    let flashKey = 0;
    let prevLevel = level;
    let isLevelUp = false;

    $: if (level !== prevLevel) {
        isLevelUp = level > prevLevel;
        prevLevel = level;
        flashKey++;
    }
</script>

{#key flashKey}
    {#if flashKey > 0}
        <span
            class="node-flash"
            class:node-flash-hex={isLeaf}
            class:node-flash-up={isLevelUp}
            class:node-flash-down={!isLevelUp}
        ></span>
        <span
            class="node-ring"
            class:node-ring-hex={isLeaf}
            class:node-ring-up={isLevelUp}
        ></span>
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
        animation: node-flash 350ms ease-out forwards;
    }

    .node-flash-hex {
        inset: var(--hex-border-width);
        border-radius: 0;
    }

    .node-flash-down {
        animation: node-flash-down 300ms ease-out forwards;
    }

    .node-ring {
        position: absolute;
        inset: -4px;
        border-radius: inherit;
        pointer-events: none;
        z-index: 2;
        border: 2px solid var(--node-flash-color);
        opacity: 0;
        animation: node-ring-expand 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .node-ring-hex {
        border-radius: 0;
    }

    .node-ring:not(.node-ring-up) {
        animation: none;
        display: none;
    }

    @keyframes node-flash {
        0% {
            opacity: 0.85;
            transform: scale(1);
        }
        40% {
            opacity: 0.4;
        }
        100% {
            opacity: 0;
            transform: scale(1);
        }
    }

    @keyframes node-flash-down {
        0% {
            opacity: 0.6;
        }
        100% {
            opacity: 0;
        }
    }

    @keyframes node-ring-expand {
        0% {
            opacity: 0.7;
            inset: 0px;
        }
        100% {
            opacity: 0;
            inset: -12px;
        }
    }
</style>
