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

  const stateIcons = {
    locked: Lock,
    available: Plus,
    active: CheckCircle2,
    maxed: Crown,
  } as const;

  $: NodeIcon = stateIcons[state] ?? Lock;
</script>

<Button
  class={`node ${state}`}
  aria-label={label || id}
  data-node-id={id}
  icon={NodeIcon}
  iconClass="node-icon"
  style={`width: ${64 * radius}px; height: ${64 * radius}px; --node-radius: ${radius};`}
>
  <span class="node-level">{level}/{maxLevel}</span>
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
    transform: translate(-50%, 50%);
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
    border-radius: 3px;
    backdrop-filter: blur(2px);
  }

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
