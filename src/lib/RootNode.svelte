<script lang="ts">
  import { Home } from "lucide-svelte";
</script>

<div class="root-node">
  <Home />
</div>

<style>
  .root-node {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    width: 100%;
    height: 100%;
  }

  .root-node :global(svg) {
    width: calc(20px * var(--node-radius, 1));
    height: calc(20px * var(--node-radius, 1));
    opacity: 0.4;
    color: rgba(201, 214, 245, 0.5);
  }
</style>
