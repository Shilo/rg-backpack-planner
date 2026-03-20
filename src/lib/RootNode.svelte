<script lang="ts">
    import { t } from "svelte-whisper";
    import { RootNodeIcon } from "./customIcons";
    import { triggerHaptic } from "./hapticsStore";
    import { tooltip } from "./tooltip";

    const ROOT_SIZE = 44;

    export let x = 0;
    export let y = 0;
    export let onRootNodeClick: ((x: number, y: number) => void) | null = null;
    export let onFocusView: (() => void) | null = null;

    function openQuickSettings(el: HTMLElement, withHaptic = false) {
        const r = el.getBoundingClientRect();
        if (withHaptic) {
            triggerHaptic();
        }
        if (onRootNodeClick) {
            onRootNodeClick(r.left + r.width / 2, r.top);
        } else {
            onFocusView?.();
        }
    }

    function handleClick(event: MouseEvent) {
        openQuickSettings(event.currentTarget as HTMLElement, true);
    }

    function handleContextMenu(event: MouseEvent) {
        openQuickSettings(event.currentTarget as HTMLElement);
    }
</script>

<div
    class="root-wrapper"
    style="left: {x}px; top: {y}px; width: {ROOT_SIZE}px; height: {ROOT_SIZE}px"
    use:tooltip={{ content: $t("quickSettings.title"), hoverOnly: true }}
>
    <button
        type="button"
        class="root-node-gear"
        data-node-id="root"
        tabindex="0"
        aria-label={$t("quickSettings.ariaLabel")}
        on:click|stopPropagation={handleClick}
        on:contextmenu|preventDefault|stopPropagation={handleContextMenu}
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
        --root-gear-fill: var(--bg-raised);
        --root-gear-stroke: var(--border);
        --root-gear-stroke-width: 2;
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
