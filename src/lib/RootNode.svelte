<script lang="ts">
  import { Hexagon } from "lucide-svelte";
  import Button from "./Button.svelte";
</script>

<Button
  class="root-node"
  icon={Hexagon}
  iconClass="root-node-icon"
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
    color: rgb(255, 179, 71);
    fill: currentColor;
  }
</style>
