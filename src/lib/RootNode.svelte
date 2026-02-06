<script lang="ts">
    import { HexagonIcon } from "phosphor-svelte";
    import Button from "./Button.svelte";

    const ROOT_SIZE = 32;

    export let onOpenTreeContextMenu: ((x: number, y: number) => void) | null =
        null;
    export let onFocusView: (() => void) | null = null;

    function handleKeydown(e: KeyboardEvent) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
        if (onOpenTreeContextMenu) {
            const r = el.getBoundingClientRect();
            onOpenTreeContextMenu(r.left + r.width / 2, r.top + r.height / 2);
        } else {
            onFocusView?.();
        }
    }
</script>

<div
    class="root-wrapper"
    data-node-id="root"
    style="left: 0px; top: 0px; width: {ROOT_SIZE}px; height: {ROOT_SIZE}px"
    on:keydown={handleKeydown}
    role="button"
    tabindex="0"
    aria-label="Tree actions"
>
    <Button
        class="root-node"
        icon={HexagonIcon}
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
        color: var(--color-root-node-text);
        fill: currentColor;
    }
</style>
