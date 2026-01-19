<script lang="ts" context="module">
  export type NodeState = "locked" | "available" | "active" | "maxed";
</script>

<script lang="ts">
  export let id: string;
  export let label: string = "";
  export let level: number = 0;
  export let maxLevel: number = 1;
  export let state: NodeState = "locked";
</script>

<button class="node {state}" aria-label={label || id} data-node-id={id}>
  <span class="node-icon" aria-hidden="true"></span>
  <span class="node-level">{level}/{maxLevel}</span>
  {#if label}
    <span class="node-label">{label}</span>
  {/if}
</button>

<style>
  .node {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 999px;
    border: 2px solid transparent;
    display: grid;
    place-items: center;
    background: #1f2a44;
    color: #e8eefc;
    font-family: inherit;
    cursor: pointer;
    touch-action: none;
    user-select: none;
    padding: 0;
  }

  .node-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: currentColor;
    opacity: 0.7;
  }

  .node-level {
    position: absolute;
    bottom: 6px;
    font-size: 0.65rem;
    opacity: 0.8;
  }

  .node-label {
    position: absolute;
    top: -18px;
    font-size: 0.65rem;
    white-space: nowrap;
    opacity: 0.75;
  }

  .locked {
    background: #1b2235;
    border-color: #2c3550;
    color: #6c7aa1;
    cursor: not-allowed;
  }

  .available {
    background: #1c2f52;
    border-color: #4c6fff;
    color: #cdd7ff;
    box-shadow: 0 0 0 2px rgba(76, 111, 255, 0.2);
  }

  .active {
    background: #2a3f73;
    border-color: #5aa6ff;
    color: #e1f0ff;
    box-shadow: 0 0 0 2px rgba(90, 166, 255, 0.3);
  }

  .maxed {
    background: #4a2e0a;
    border-color: #ffb347;
    color: #ffe8c7;
    box-shadow: 0 0 0 2px rgba(255, 179, 71, 0.35);
  }
</style>
