<script lang="ts">
  import {
    ArrowDownIcon,
    ArrowUpIcon,
    CheckCircleIcon,
    CaretDoubleUpIcon,
    CrownIcon,
    LockIcon,
    PlusIcon,
    ArrowCounterClockwiseIcon,
  } from "phosphor-svelte";
  import Button from "./Button.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import { formatNumber } from "./mathUtil";

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
    locked: LockIcon,
    available: PlusIcon,
    active: CheckCircleIcon,
    maxed: CrownIcon,
  } as const;

  $: NodeIcon = stateIcons[state] ?? LockIcon;
</script>

<ContextMenu
  {x}
  {y}
  {isOpen}
  title={nodeId ?? "Node actions"}
  ariaLabel="Node actions"
  {onClose}
>
  <div class="node-stats">
    <div class="node-icon-wrapper">
      <svelte:component this={NodeIcon} />
    </div>
    <div class="node-stats-content">
      <div class="stat-row">
        <span class="stat-label">DB & Val ATK Bonus</span>
        <span class="stat-value">30,000%</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Levels:</span>
        <span class="stat-value"
          >{formatNumber(level)} / {formatNumber(maxLevel)}</span
        >
      </div>
      <div class="level-progress">
        <div
          class="level-progress-bar"
          style={`width: ${maxLevel > 0 ? (level / maxLevel) * 100 : 0}%`}
        ></div>
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
        disabled={!nodeId || level >= maxLevel}
        icon={ArrowUpIcon}
        positive
      >
        Increase
      </Button>
      <Button
        on:click={() => {
          if (!nodeId || !onDecrement) return;
          onDecrement(nodeId);
        }}
        disabled={!nodeId || level <= 0}
        icon={ArrowDownIcon}
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
        disabled={!nodeId || level >= maxLevel}
        icon={CaretDoubleUpIcon}
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
        disabled={!nodeId || level <= 0}
        icon={ArrowCounterClockwiseIcon}
        negative
      >
        Reset
      </Button>
    </div>
  </div>
</ContextMenu>

<style>
  .node-stats {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(44, 60, 97, 0.5);
    display: flex;
    align-items: flex-start;
    gap: 12px;
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

  .node-stats-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
  }

  .stat-label {
    color: #8fa4ce;
  }

  .stat-value {
    color: #e8eefc;
    font-weight: 600;
  }

  .level-progress {
    width: 100%;
    height: 6px;
    background: rgba(44, 53, 80, 0.5);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 2px;
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
