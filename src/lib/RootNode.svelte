<script lang="ts" context="module">
  import type { RootNodeConfig } from "../types/baseTree.types";

  /** Root node at (0, 0); not customizable. */
  export function getRootNode(): RootNodeConfig {
    return {
      id: "root",
      x: 0,
      y: 0,
      maxLevel: 0,
      radius: 60 / 65,
    };
  }
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
  style={`width: 100%; height: 100%; --node-radius: var(--node-radius, 1);`}
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
