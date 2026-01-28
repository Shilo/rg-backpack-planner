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
</script>

<Button
  class="root-node"
  icon={HexagonIcon}
  iconClass="root-node-icon"
  iconWeight="fill"
  style="width: 100%; height: 100%; --node-radius: var(--node-radius, 1);"
/>

<style>
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
