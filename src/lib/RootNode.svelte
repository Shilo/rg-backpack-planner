<script lang="ts">
    import { t } from "svelte-whisper";
    import { RootNodeIcon } from "./customIcons";
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
        <RootNodeIcon class="root-node-gear-icon" aria-hidden="true" />
    </button>
</div>

<style>
    .root-wrapper {
        position: absolute;
        transform: translate(-50%, -50%);
        cursor: pointer;
    }

    .root-node-gear {
        --root-gear-fill: var(--surface);
        --root-gear-stroke: var(--border);
        --root-gear-stroke-width: 3;
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

    .root-node-gear :global(.root-node-gear-icon) {
        display: block;
        width: 100%;
        height: 100%;
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
