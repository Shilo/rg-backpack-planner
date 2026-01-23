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
  export let isLeaf: boolean = false;

  const stateIcons = {
    locked: Lock,
    available: Plus,
    active: CheckCircle2,
    maxed: Crown,
  } as const;

  $: NodeIcon = stateIcons[state] ?? Lock;
</script>

<Button
  class={`node ${state} region-${region} ${isLeaf ? "node-hexagon" : ""}`}
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
  /* CSS Custom Properties - All color variables defined here */
  :global(.button.node) {
    /* Brightness values for locked states */
    --brightness-locked: 0.4;
    --brightness-locked-hexagon: 0.5;

    /* Fallback variables for nodes without region */
    --fallback-bg-available: #1c2f52;
    --fallback-bg-active: #2a3f73;
    --fallback-bg-maxed: #4a2e0a;
    --fallback-border-color: #4c6fff;
    --fallback-border-color-active: #5aa6ff;
    --fallback-border-color-maxed: #ffb347;
    --fallback-text-color: #cdd7ff;
    --fallback-text-color-active: #e1f0ff;
    --fallback-text-color-maxed: #ffe8c7;
  }

  /* Top-left region (Orange theme) */
  :global(.button.node.region-top-left) {
    --bg-available: #6b3f1f;
    --bg-active: #8b4f2f;
    --bg-maxed: #ab5f3f;
    --border-color: #ff6b35;
    --border-color-maxed: #ff8c5a;
    --text-color: #ffd4b8;
    --text-color-maxed: #ffe8d4;
  }

  /* Bottom-left region (Yellow theme) */
  :global(.button.node.region-bottom-left) {
    --bg-available: #3d3d0a;
    --bg-active: #5a5a1a;
    --bg-maxed: #6a6a2a;
    --border-color: #ffd700;
    --border-color-maxed: #ffeb3b;
    --text-color: #fff9cc;
    --text-color-maxed: #fffdd0;
  }

  /* Right region (Blue theme) */
  :global(.button.node.region-right) {
    --bg-available: #1c2f52;
    --bg-active: #2a3f73;
    --bg-maxed: #3a4f83;
    --border-color: #4a90e2;
    --border-color-maxed: #6bb6ff;
    --text-color: #b8d9ff;
    --text-color-active: #c8e5ff;
    --text-color-maxed: #e1f0ff;
  }

  /* Hexagon border colors */
  :global(.button.node.region-top-left.node-hexagon) {
    --border-color: #ff6b35;
    --border-color-maxed: #ff8c5a;
  }

  :global(.button.node.region-bottom-left.node-hexagon) {
    --border-color: #ffd700;
    --border-color-maxed: #ffeb3b;
  }

  :global(.button.node.region-right.node-hexagon) {
    --border-color: #4a90e2;
    --border-color-maxed: #6bb6ff;
  }

  :global(.button.node.node-hexagon) {
    --border-color: #4c6fff;
    --border-color-maxed: #ffb347;
  }

  /* Hexagon background colors */
  :global(.button.node.region-top-left.node-hexagon) {
    --hex-bg: #2f2e2a;
  }

  :global(.button.node.region-bottom-left.node-hexagon) {
    --hex-bg: #2f2f2a;
  }

  :global(.button.node.region-right.node-hexagon) {
    --hex-bg: #2a3441;
  }

  /* Base node styles */
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

  /* Hexagon shape for leaf nodes - flat top and bottom, all sides equal */
  :global(.button.node.node-hexagon) {
    border-radius: 0;
    border: none;
    position: relative;
    overflow: visible;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  }

  /* Create border using pseudo-element that follows the hexagon shape */
  :global(.button.node.node-hexagon::before) {
    content: "";
    position: absolute;
    inset: -3px;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    z-index: -1;
    pointer-events: none;
  }

  /* Create inner hexagon mask to show only the border */
  :global(.button.node.node-hexagon::after) {
    content: "";
    position: absolute;
    inset: 3px;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    z-index: -1;
    pointer-events: none;
    background: #2a3441; /* Default, overridden by region-specific rules */
  }

  /* Top-left region border colors */
  :global(.button.node.region-top-left.node-hexagon.locked::before) {
    background: var(--border-color);
    filter: brightness(var(--brightness-locked-hexagon));
  }

  :global(.button.node.region-top-left.node-hexagon.available::before) {
    background: var(--border-color);
    filter: drop-shadow(
        0 0 4px color-mix(in srgb, var(--border-color) 40%, transparent)
      )
      drop-shadow(
        0 0 8px color-mix(in srgb, var(--border-color) 20%, transparent)
      );
  }

  :global(.button.node.region-top-left.node-hexagon.active::before) {
    background: var(--border-color);
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color) 50%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color) 30%, transparent)
      );
  }

  :global(.button.node.region-top-left.node-hexagon.maxed::before) {
    background: var(--border-color-maxed);
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color-maxed) 50%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color-maxed) 30%, transparent)
      );
  }

  /* Bottom-left region border colors */
  :global(.button.node.region-bottom-left.node-hexagon.locked::before) {
    background: var(--border-color);
    filter: brightness(var(--brightness-locked-hexagon));
  }

  :global(.button.node.region-bottom-left.node-hexagon.available::before) {
    background: var(--border-color);
    filter: drop-shadow(
        0 0 4px color-mix(in srgb, var(--border-color) 40%, transparent)
      )
      drop-shadow(
        0 0 8px color-mix(in srgb, var(--border-color) 20%, transparent)
      );
  }

  :global(.button.node.region-bottom-left.node-hexagon.active::before) {
    background: var(--border-color);
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color) 50%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color) 30%, transparent)
      );
  }

  :global(.button.node.region-bottom-left.node-hexagon.maxed::before) {
    background: var(--border-color-maxed);
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color-maxed) 50%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color-maxed) 30%, transparent)
      );
  }

  /* Right region border colors */
  :global(.button.node.region-right.node-hexagon.locked::before) {
    background: var(--border-color);
    filter: brightness(var(--brightness-locked-hexagon));
  }

  :global(.button.node.region-right.node-hexagon.available::before) {
    background: var(--border-color);
    filter: drop-shadow(
        0 0 4px color-mix(in srgb, var(--border-color) 40%, transparent)
      )
      drop-shadow(
        0 0 8px color-mix(in srgb, var(--border-color) 20%, transparent)
      );
  }

  :global(.button.node.region-right.node-hexagon.active::before) {
    background: var(--border-color);
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color) 50%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color) 30%, transparent)
      );
  }

  :global(.button.node.region-right.node-hexagon.maxed::before) {
    background: var(--border-color-maxed);
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color-maxed) 50%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color-maxed) 30%, transparent)
      );
  }

  /* Fallback for nodes without region */
  :global(.button.node.node-hexagon.locked::before) {
    background: var(--border-color);
    filter: brightness(var(--brightness-locked-hexagon));
  }

  :global(.button.node.node-hexagon.available::before) {
    background: var(--border-color);
    filter: drop-shadow(
        0 0 4px color-mix(in srgb, var(--border-color) 40%, transparent)
      )
      drop-shadow(
        0 0 8px color-mix(in srgb, var(--border-color) 20%, transparent)
      );
  }

  :global(.button.node.node-hexagon.active::before) {
    background: var(--border-color);
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color) 50%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color) 30%, transparent)
      );
  }

  :global(.button.node.node-hexagon.maxed::before) {
    background: var(--border-color-maxed);
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color-maxed) 50%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color-maxed) 30%, transparent)
      );
  }

  /* Hexagon inner colors - dark slate gray with theme variants */
  :global(.button.node.region-top-left.node-hexagon) {
    background: var(--hex-bg) !important;
  }

  :global(.button.node.region-top-left.node-hexagon::after) {
    background: var(--hex-bg);
  }

  :global(.button.node.region-top-left.node-hexagon.available) {
    filter: drop-shadow(
        0 0 4px color-mix(in srgb, var(--border-color) 30%, transparent)
      )
      drop-shadow(
        0 0 8px color-mix(in srgb, var(--border-color) 15%, transparent)
      );
  }

  :global(.button.node.region-top-left.node-hexagon.active) {
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color) 40%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color) 20%, transparent)
      );
  }

  :global(.button.node.region-top-left.node-hexagon.maxed) {
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color-maxed) 40%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color-maxed) 20%, transparent)
      );
  }

  :global(.button.node.region-bottom-left.node-hexagon) {
    background: var(--hex-bg) !important;
  }

  :global(.button.node.region-bottom-left.node-hexagon::after) {
    background: var(--hex-bg);
  }

  :global(.button.node.region-bottom-left.node-hexagon.available) {
    filter: drop-shadow(
        0 0 4px color-mix(in srgb, var(--border-color) 30%, transparent)
      )
      drop-shadow(
        0 0 8px color-mix(in srgb, var(--border-color) 15%, transparent)
      );
  }

  :global(.button.node.region-bottom-left.node-hexagon.active) {
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color) 40%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color) 20%, transparent)
      );
  }

  :global(.button.node.region-bottom-left.node-hexagon.maxed) {
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color-maxed) 40%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color-maxed) 20%, transparent)
      );
  }

  :global(.button.node.region-right.node-hexagon) {
    background: var(--hex-bg) !important;
  }

  :global(.button.node.region-right.node-hexagon::after) {
    background: var(--hex-bg);
  }

  :global(.button.node.region-right.node-hexagon.available) {
    filter: drop-shadow(
        0 0 4px color-mix(in srgb, var(--border-color) 30%, transparent)
      )
      drop-shadow(
        0 0 8px color-mix(in srgb, var(--border-color) 15%, transparent)
      );
  }

  :global(.button.node.region-right.node-hexagon.active) {
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color) 40%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color) 20%, transparent)
      );
  }

  :global(.button.node.region-right.node-hexagon.maxed) {
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color-maxed) 40%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color-maxed) 20%, transparent)
      );
  }

  /* Fallback for nodes without region */
  :global(.button.node.node-hexagon::after) {
    background: #2a3441;
  }

  :global(.button.node.node-hexagon.available) {
    filter: drop-shadow(
        0 0 4px color-mix(in srgb, var(--border-color) 30%, transparent)
      )
      drop-shadow(
        0 0 8px color-mix(in srgb, var(--border-color) 15%, transparent)
      );
  }

  :global(.button.node.node-hexagon.active) {
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color) 40%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color) 20%, transparent)
      );
  }

  :global(.button.node.node-hexagon.maxed) {
    filter: drop-shadow(
        0 0 6px color-mix(in srgb, var(--border-color-maxed) 40%, transparent)
      )
      drop-shadow(
        0 0 12px color-mix(in srgb, var(--border-color-maxed) 20%, transparent)
      );
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
    background: var(--bg-available);
    border-color: var(--border-color);
    color: var(--text-color);
    filter: brightness(var(--brightness-locked));
  }

  :global(.button.node.region-top-left.available) {
    background: var(--bg-available);
    border-color: var(--border-color);
    color: var(--text-color);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color) 20%, transparent);
  }

  :global(.button.node.region-top-left.active) {
    background: var(--bg-active);
    border-color: var(--border-color);
    color: var(--text-color);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color) 30%, transparent);
  }

  :global(.button.node.region-top-left.maxed) {
    background: var(--bg-maxed);
    border-color: var(--border-color-maxed);
    color: var(--text-color-maxed);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color-maxed) 35%, transparent);
  }

  /* Bottom-left region (Yellow theme - bright gold for colorblind-friendly) */
  :global(.button.node.region-bottom-left.locked) {
    background: var(--bg-available);
    border-color: var(--border-color);
    color: var(--text-color);
    filter: brightness(var(--brightness-locked));
  }

  :global(.button.node.region-bottom-left.available) {
    background: var(--bg-available);
    border-color: var(--border-color);
    color: var(--text-color);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color) 20%, transparent);
  }

  :global(.button.node.region-bottom-left.active) {
    background: var(--bg-active);
    border-color: var(--border-color);
    color: var(--text-color);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color) 30%, transparent);
  }

  :global(.button.node.region-bottom-left.maxed) {
    background: var(--bg-maxed);
    border-color: var(--border-color-maxed);
    color: var(--text-color-maxed);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color-maxed) 35%, transparent);
  }

  /* Right region (Blue theme - saturated blue for colorblind-friendly) */
  :global(.button.node.region-right.locked) {
    background: var(--bg-available);
    border-color: var(--border-color);
    color: var(--text-color);
    filter: brightness(var(--brightness-locked));
  }

  :global(.button.node.region-right.available) {
    background: var(--bg-available);
    border-color: var(--border-color);
    color: var(--text-color);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color) 20%, transparent);
  }

  :global(.button.node.region-right.active) {
    background: var(--bg-active);
    border-color: var(--border-color);
    color: var(--text-color-active);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color) 30%, transparent);
  }

  :global(.button.node.region-right.maxed) {
    background: var(--bg-maxed);
    border-color: var(--border-color-maxed);
    color: var(--text-color-maxed);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--border-color-maxed) 35%, transparent);
  }

  /* Fallback for nodes without region (shouldn't happen) */
  :global(.button.node.locked) {
    background: var(--fallback-bg-available);
    border-color: var(--fallback-border-color);
    color: var(--fallback-text-color);
    filter: brightness(var(--brightness-locked));
  }

  :global(.button.node.available) {
    background: var(--fallback-bg-available);
    border-color: var(--fallback-border-color);
    color: var(--fallback-text-color);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--fallback-border-color) 20%, transparent);
  }

  :global(.button.node.active) {
    background: var(--fallback-bg-active);
    border-color: var(--fallback-border-color-active);
    color: var(--fallback-text-color-active);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--fallback-border-color-active) 30%, transparent);
  }

  :global(.button.node.maxed) {
    background: var(--fallback-bg-maxed);
    border-color: var(--fallback-border-color-maxed);
    color: var(--fallback-text-color-maxed);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--fallback-border-color-maxed) 35%, transparent);
  }
</style>
