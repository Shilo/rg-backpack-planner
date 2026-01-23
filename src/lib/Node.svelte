<script lang="ts" context="module">
  export type NodeState = "locked" | "available" | "active" | "maxed";
</script>

<script lang="ts">
  import { CheckCircle2, Crown, Lock, Plus } from "lucide-svelte";
  import Button from "./Button.svelte";

  export let id: string;
  export let label: string = "";
  export let level: number = 0;
  export let maxLevel: number = 1;
  export let state: NodeState = "locked";
  export let radius: number = 1;
  export let scale: number = 1;
  export let region: "top-left" | "bottom-left" | "right" = "right";

  const stateIcons = {
    locked: Lock,
    available: Plus,
    active: CheckCircle2,
    maxed: Crown,
  } as const;

  $: NodeIcon = stateIcons[state] ?? Lock;
</script>

<Button
  class={`node ${state} region-${region}`}
  aria-label={label || id}
  data-node-id={id}
  icon={NodeIcon}
  iconClass="node-icon"
  style={`width: ${64 * radius}px; height: ${64 * radius}px; --node-radius: ${radius};`}
>
  {#if level > 0}
    <span
      class="node-level"
      style={`transform: translate(-50%, 50%) scale(${1 / scale});`}
      >{level}</span
    >
  {/if}
</Button>

<style>
  :global(.button.node) {
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
    text-align: center;
  }

  :global(.button.node.with-icon) {
    display: grid;
    justify-content: center;
    gap: 0;
    place-items: center;
    grid-template-areas: "stack";
  }

  :global(.node-icon) {
    width: calc(24px * var(--node-radius, 1));
    height: calc(24px * var(--node-radius, 1));
    opacity: 0.7;
    grid-area: stack;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  :global(.button.node .button-text) {
    grid-area: stack;
    display: contents;
  }

  .node-level {
    position: absolute;
    bottom: 0;
    left: 50%;
    pointer-events: none;
    white-space: nowrap;
    line-height: 1.2;
    font-size: 0.75rem;
    font-weight: 600;
    color: #ffffff;
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.9),
      0 0 4px rgba(0, 0, 0, 0.6),
      1px 0 2px rgba(0, 0, 0, 0.9),
      -1px 0 2px rgba(0, 0, 0, 0.9);
    background: rgba(0, 0, 0, 0.4);
    padding: 2px 4px;
    border-radius: 8px;
    transform-origin: center bottom;
  }

  /* Top-left region (Orange theme - colorblind-friendly red-orange) */
  :global(.button.node.region-top-left.locked) {
    background: #3d1f0f;
    border-color: #7a3f2f;
    color: #aa7f5f;
    cursor: not-allowed;
  }

  :global(.button.node.region-top-left.available) {
    background: #6b3f1f;
    border-color: #ff6b35;
    color: #ffd4b8;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
  }

  :global(.button.node.region-top-left.active) {
    background: #8b4f2f;
    border-color: #ff6b35;
    color: #ffd4b8;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.3);
  }

  :global(.button.node.region-top-left.maxed) {
    background: #ab5f3f;
    border-color: #ff8c5a;
    color: #ffe8d4;
    box-shadow: 0 0 0 2px rgba(255, 140, 90, 0.35);
  }

  /* Bottom-left region (Yellow theme - bright gold for colorblind-friendly) */
  :global(.button.node.region-bottom-left.locked) {
    background: #2a2a0a;
    border-color: #5a5a1a;
    color: #8a8a3a;
    cursor: not-allowed;
  }

  :global(.button.node.region-bottom-left.available) {
    background: #3d3d0a;
    border-color: #ffd700;
    color: #fff9cc;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
  }

  :global(.button.node.region-bottom-left.active) {
    background: #5a5a1a;
    border-color: #ffd700;
    color: #fff9cc;
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
  }

  :global(.button.node.region-bottom-left.maxed) {
    background: #6a6a2a;
    border-color: #ffeb3b;
    color: #fffdd0;
    box-shadow: 0 0 0 2px rgba(255, 235, 59, 0.35);
  }

  /* Right region (Blue theme - saturated blue for colorblind-friendly) */
  :global(.button.node.region-right.locked) {
    background: #1b2235;
    border-color: #2c3550;
    color: #6c7aa1;
    cursor: not-allowed;
  }

  :global(.button.node.region-right.available) {
    background: #1c2f52;
    border-color: #4a90e2;
    color: #b8d9ff;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }

  :global(.button.node.region-right.active) {
    background: #2a3f73;
    border-color: #4a90e2;
    color: #c8e5ff;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3);
  }

  :global(.button.node.region-right.maxed) {
    background: #3a4f83;
    border-color: #6bb6ff;
    color: #e1f0ff;
    box-shadow: 0 0 0 2px rgba(107, 182, 255, 0.35);
  }

  /* Fallback for nodes without region (shouldn't happen) */
  :global(.button.node.locked) {
    background: #1b2235;
    border-color: #2c3550;
    color: #6c7aa1;
    cursor: not-allowed;
  }

  :global(.button.node.available) {
    background: #1c2f52;
    border-color: #4c6fff;
    color: #cdd7ff;
    box-shadow: 0 0 0 2px rgba(76, 111, 255, 0.2);
  }

  :global(.button.node.active) {
    background: #2a3f73;
    border-color: #5aa6ff;
    color: #e1f0ff;
    box-shadow: 0 0 0 2px rgba(90, 166, 255, 0.3);
  }

  :global(.button.node.maxed) {
    background: #4a2e0a;
    border-color: #ffb347;
    color: #ffe8c7;
    box-shadow: 0 0 0 2px rgba(255, 179, 71, 0.35);
  }
</style>
