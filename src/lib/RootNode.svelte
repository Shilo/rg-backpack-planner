<script lang="ts">
    import { GearSix } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import { t } from "svelte-whisper";

    const ROOT_SIZE = 32;

    export let x = 0;
    export let y = 0;
    export let onRootNodeClick: ((x: number, y: number) => void) | null = null;
    export let onFocusView: (() => void) | null = null;

    function handleKeydown(e: KeyboardEvent) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
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
    data-node-id="root"
    style="left: {x}px; top: {y}px; width: {ROOT_SIZE}px; height: {ROOT_SIZE}px"
    on:keydown={handleKeydown}
    role="button"
    tabindex="0"
    aria-label={$t("quickSettings.ariaLabel")}
>
    <Button
        class="root-node"
        icon={GearSix}
        iconClass="root-node-icon"
        iconWeight="fill"
        style="width: 100%; height: 100%;"
        small
    />
</div>

<style>
    .root-wrapper {
        position: absolute;
        transform: translate(-50%, -50%);
        cursor: pointer;
    }

    :global(.button.root-node) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 0;
        border: none;
        background: transparent;
    }

    :global(.root-node-icon) {
        width: 100%;
        height: 100%;
        color: var(--border);
        fill: currentColor;
    }
</style>
