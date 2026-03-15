<script lang="ts">
    import { t } from "svelte-whisper";
    import { triggerHaptic } from "./hapticsStore";

    const ROOT_SIZE = 44;

    export let x = 0;
    export let y = 0;
    export let onRootNodeClick: ((x: number, y: number) => void) | null = null;
    export let onFocusView: (() => void) | null = null;

    function handleKeydown(e: KeyboardEvent) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
        triggerHaptic();
        if (onRootNodeClick) {
            const r = el.getBoundingClientRect();
            onRootNodeClick(r.left + r.width / 2, r.top + r.height / 2);
        } else {
            onFocusView?.();
        }
    }
</script>

<div
    class="root-wrapper"
    style="left: {x}px; top: {y}px; width: {ROOT_SIZE}px; height: {ROOT_SIZE}px"
>
    <button
        class="root-node-gear"
        data-node-id="root"
        tabindex="0"
        aria-label={$t("quickSettings.ariaLabel")}
        on:keydown={handleKeydown}
    >
        <svg viewBox="0 0 44 44" aria-hidden="true">
            <path
                d="M 22 2.5 C 27 2.5 25.46 8.41 28.75 10.31 C 32.04 12.21 36.39 7.92 38.89 12.25 C 41.39 16.58 35.5 18.2 35.5 22 C 35.5 25.8 41.39 27.42 38.89 31.75 C 36.39 36.08 32.04 31.79 28.75 33.69 C 25.46 35.59 27 41.5 22 41.5 C 17 41.5 18.54 35.59 15.25 33.69 C 11.96 31.79 7.61 36.08 5.11 31.75 C 2.61 27.42 8.5 25.8 8.5 22 C 8.5 18.2 2.61 16.58 5.11 12.25 C 7.61 7.92 11.96 12.21 15.25 10.31 C 18.54 8.41 17 2.5 22 2.5 Z"
            />
        </svg>
    </button>
</div>

<style>
    .root-wrapper {
        position: absolute;
        transform: translate(-50%, -50%);
        cursor: pointer;
    }

    .root-node-gear {
        width: 100%;
        height: 100%;
        padding: 0;
        border: none;
        background: transparent;
        box-shadow: none;
        outline: none;
        cursor: pointer;
        filter: drop-shadow(var(--shadow-node-hex));
    }

    .root-node-gear svg {
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
    }

    .root-node-gear path {
        fill: var(--surface);
        stroke: var(--border);
        stroke-width: 3;
        stroke-linejoin: round;
    }

    @media (hover: hover) {
        .root-node-gear:hover {
            filter: var(--brightness-hover);
        }
    }

    .root-node-gear:active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }
</style>
