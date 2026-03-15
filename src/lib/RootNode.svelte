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
    ></button>
</div>

<style>
    .root-wrapper {
        position: absolute;
        transform: translate(-50%, -50%);
        cursor: pointer;
    }

    .root-node-gear {
        --gear-clip: polygon(
            79.67% 38.01%, 94.32% 42.19%, 94.32% 57.81%, 79.67% 61.99%,
            75.22% 69.70%, 78.93% 84.47%, 65.39% 92.29%, 54.45% 81.69%,
            45.55% 81.69%, 34.61% 92.29%, 21.07% 84.47%, 24.78% 69.70%,
            20.33% 61.99%,  5.68% 57.81%,  5.68% 42.19%, 20.33% 38.01%,
            24.78% 30.30%, 21.07% 15.53%, 34.61%  7.71%, 45.55% 18.31%,
            54.45% 18.31%, 65.39%  7.71%, 78.93% 15.53%, 75.22% 30.30%
        );
        --gear-fill: var(--surface);
        --gear-border-color: var(--border);
        --gear-border-width: 2px;

        width: 100%;
        height: 100%;
        padding: 0;
        clip-path: var(--gear-clip);
        position: relative;
        overflow: visible;
        isolation: isolate;
        background: transparent;
        border: none;
        box-shadow: none;
        filter: drop-shadow(var(--shadow-node-hex));
        outline: none;
        cursor: pointer;
    }

    .root-node-gear::before {
        content: "";
        position: absolute;
        inset: 0;
        clip-path: var(--gear-clip);
        background: var(--gear-border-color);
        z-index: 0;
        pointer-events: none;
    }

    .root-node-gear::after {
        content: "";
        position: absolute;
        inset: var(--gear-border-width);
        clip-path: var(--gear-clip);
        background: var(--gear-fill);
        z-index: 0;
        pointer-events: none;
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
