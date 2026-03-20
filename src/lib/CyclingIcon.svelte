<script lang="ts">
    import type { Component } from "svelte";
    import { onMount, onDestroy } from "svelte";

    export let icons: { component: Component }[] = [];

    const CYCLE_MS = 2400;

    let currentIndex = 0;
    let interval: ReturnType<typeof setInterval> | undefined;

    onMount(() => {
        if (icons.length > 1) {
            const motionOk = !window.matchMedia(
                "(prefers-reduced-motion: reduce)",
            ).matches;
            if (motionOk) {
                interval = setInterval(() => {
                    currentIndex = (currentIndex + 1) % icons.length;
                }, CYCLE_MS);
            }
        }
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
    });
</script>

{#if icons.length === 1}
    <svelte:component this={icons[0].component} />
{:else if icons.length > 1}
    <span class="cycling">
        {#each icons as icon, i}
            <span class="frame" class:active={i === currentIndex}>
                <svelte:component this={icon.component} />
            </span>
        {/each}
    </span>
{/if}

<style>
    .cycling {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
    }

    .frame {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 300ms ease;
        pointer-events: none;
    }

    .frame.active {
        opacity: 1;
    }

    .frame :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    @media (prefers-reduced-motion: reduce) {
        .frame {
            transition: none;
        }
    }
</style>
