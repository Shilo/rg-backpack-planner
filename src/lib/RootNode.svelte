<script lang="ts" context="module">
  /** Root is a visual button at (0,0). Not levelable. data-node-id for events only. */
  export const ROOT_ID = "root";
  export const ROOT_X = 0;
  export const ROOT_Y = 0;
  const R = 60 / 65;
  export const ROOT_RADIUS = R;
  export const ROOT_SIZE = 64 * R;
</script>

<script lang="ts">
  import { HexagonIcon } from "phosphor-svelte";
  import Button from "./Button.svelte";

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
  data-node-id={ROOT_ID}
  style="left: {ROOT_X}px; top: {ROOT_Y}px; width: {ROOT_SIZE}px; height: {ROOT_SIZE}px; --node-radius: {ROOT_RADIUS}"
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
    style="width: 100%; height: 100%; --node-radius: var(--node-radius, 1);"
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
    width: calc(32px * var(--node-radius, 1));
    height: calc(32px * var(--node-radius, 1));
    opacity: 1;
    color: #8a95b0;
    fill: currentColor;
  }
</style>
