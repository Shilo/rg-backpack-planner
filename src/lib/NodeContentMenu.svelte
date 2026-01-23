<script lang="ts">
  import { ArrowDown, ArrowUp, CheckCircle2, ChevronsUp, Crown, Lock, Plus, RotateCcw } from "lucide-svelte";
  import Button from "./Button.svelte";
  import ContextMenu from "./ContextMenu.svelte";

  export let nodeId = "";
  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onMax: ((id: string) => void) | null = null;
  export let onReset: ((id: string) => void) | null = null;
  export let onDecrement: ((id: string) => void) | null = null;
  export let onIncrement: ((id: string) => void) | null = null;
  export let level: number = 0;
  export let maxLevel: number = 0;
  export let state: "locked" | "available" | "active" | "maxed" = "locked";

  const stateIcons = {
    locked: Lock,
    available: Plus,
    active: CheckCircle2,
    maxed: Crown,
  } as const;

  $: NodeIcon = stateIcons[state] ?? Lock;
</script>

<ContextMenu
  {x}
  {y}
  {isOpen}
  title={nodeId ?? "Node actions"}
  ariaLabel="Node actions"
  {onClose}
>
  <div class="node-info">
    <div class="node-icon-wrapper">
      <svelte:component this={NodeIcon} />
    </div>
    <div class="node-level-info">
      <span class="level-text">{level}/{maxLevel}</span>
      <div class="level-progress">
        <div class="level-progress-bar" style={`width: ${maxLevel > 0 ? (level / maxLevel) * 100 : 0}%`}></div>
      </div>
    </div>
  </div>
  <div class="button-columns">
    <div class="button-column">
      <Button
        on:click={() => {
          if (!nodeId || !onIncrement) return;
          onIncrement(nodeId);
        }}
        toastMessage={nodeId && onIncrement ? `Increased ${nodeId}` : undefined}
        disabled={!nodeId}
        icon={ArrowUp}
        positive
      >
        Increase
      </Button>
      <Button
        on:click={() => {
          if (!nodeId || !onDecrement) return;
          onDecrement(nodeId);
        }}
        toastMessage={nodeId && onDecrement ? `Decreased ${nodeId}` : undefined}
        disabled={!nodeId}
        icon={ArrowDown}
        negative
      >
        Decrease
      </Button>
    </div>
    <div class="button-column">
      <Button
        on:click={() => {
          if (!nodeId || !onMax) return;
          onMax(nodeId);
        }}
        toastMessage={nodeId && onMax ? `Maxed ${nodeId}` : undefined}
        disabled={!nodeId}
        icon={ChevronsUp}
        positive
      >
        Max
      </Button>
      <Button
        on:click={() => {
          if (!nodeId || !onReset) return;
          onReset(nodeId);
        }}
        toastMessage={nodeId && onReset ? `Reset ${nodeId}` : undefined}
        toastNegative
        disabled={!nodeId}
        icon={RotateCcw}
        negative
      >
        Reset
      </Button>
    </div>
  </div>
</ContextMenu>

<style>
  .node-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    margin-bottom: 4px;
    background: rgba(31, 42, 68, 0.5);
    border-radius: 8px;
  }

  .node-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }

  .node-icon-wrapper :global(svg) {
    width: 24px;
    height: 24px;
    opacity: 0.8;
  }

  .node-level-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .level-text {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e8eefc;
  }

  .level-progress {
    width: 100%;
    height: 6px;
    background: rgba(44, 53, 80, 0.5);
    border-radius: 3px;
    overflow: hidden;
  }

  .level-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4c6fff, #5aa6ff);
    border-radius: 3px;
    transition: width 0.2s ease;
  }

  .button-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .button-column {
    display: grid;
    gap: 6px;
  }
</style>
