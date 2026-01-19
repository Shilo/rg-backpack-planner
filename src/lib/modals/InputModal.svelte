<script lang="ts">
  import type { ComponentType } from "svelte";
  import { Minus, Plus, RotateCcw } from "lucide-svelte";
  import { onMount } from "svelte";
  import Button from "../Button.svelte";

  export let title = "";
  export let titleIcon: ComponentType | null = null;
  export let titleIconClass = "";
  export let titleIconAriaHidden = true;
  export let message: string | undefined = undefined;
  export let label = "Value";
  export let value = 0;
  export let min = 0;
  export let step = 1;
  export let placeholder: string | undefined = undefined;
  export let confirmLabel = "Save";
  export let cancelLabel = "Cancel";
  export let onConfirm: ((value: number) => void) | null = null;
  export let onCancel: (() => void) | null = null;

  let valueText = `${Math.max(min, Math.floor(value))}`;
  let inputEl: HTMLInputElement | null = null;

  function parseValue() {
    const parsed = Number.parseInt(valueText, 10);
    if (Number.isNaN(parsed)) return Math.max(min, 0);
    return Math.max(min, parsed);
  }

  function clampValueText() {
    valueText = `${parseValue()}`;
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    valueText = target.value.replace(/\D+/g, "");
  }

  function stepValue(delta: number) {
    const nextValue = Math.max(min, parseValue() + delta);
    valueText = `${nextValue}`;
  }

  function handleConfirm() {
    const nextValue = parseValue();
    onConfirm?.(nextValue);
  }

  function handleReset() {
    valueText = "0";
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleConfirm();
    }
  }

  onMount(() => {
    inputEl?.focus();
    inputEl?.select();
  });
</script>

<div class="modal-content">
  <header class="modal-header">
    <div class="modal-title">
      {#if titleIcon}
        <svelte:component
          this={titleIcon}
          class={`modal-title-icon ${titleIconClass}`.trim()}
          aria-hidden={titleIconAriaHidden}
        />
      {/if}
      <h2>{title}</h2>
    </div>
  </header>
  {#if message}
    <p class="modal-message">{message}</p>
  {/if}
  <label class="modal-label" for="modal-input">{label}</label>
  <div class="modal-input-row">
    <button
      class="stepper stepper-icon"
      type="button"
      aria-label="Decrease value"
      on:click={() => stepValue(-step)}
    >
      <Minus class="stepper-icon__svg" aria-hidden="true" />
    </button>
    <input
      id="modal-input"
      class="modal-input"
      bind:this={inputEl}
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      autocomplete="off"
      {placeholder}
      value={valueText}
      on:input={handleInput}
      on:blur={clampValueText}
      on:keydown={handleKeydown}
    />
    <button
      class="stepper stepper-icon"
      type="button"
      aria-label="Increase value"
      on:click={() => stepValue(step)}
    >
      <Plus class="stepper-icon__svg" aria-hidden="true" />
    </button>
  </div>
  <div class="modal-actions">
    <button
      class="stepper stepper-icon reset-button"
      type="button"
      aria-label="Reset value"
      on:click={handleReset}
    >
      <RotateCcw class="stepper-icon__svg" aria-hidden="true" />
    </button>
    <div class="modal-actions__right">
      <Button on:click={() => onCancel?.()} negative>{cancelLabel}</Button>
      <Button on:click={handleConfirm}>{confirmLabel}</Button>
    </div>
  </div>
</div>

<style>
  .modal-content {
    display: grid;
    gap: 12px;
  }

  .modal-header {
    display: flex;
    align-items: center;
  }

  .modal-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.05rem;
    color: #f1f5ff;
    line-height: 1;
  }

  :global(.modal-title-icon) {
    width: 18px;
    height: 18px;
    color: #b9c7ec;
  }

  .modal-message {
    margin: 0;
    font-size: 0.92rem;
    color: #c8d6f7;
    line-height: 1.4;
  }

  .modal-label {
    font-size: 0.85rem;
    color: #b9c7ec;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .modal-input-row {
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    gap: 10px;
    align-items: center;
  }

  .modal-input {
    width: 100%;
    height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(72, 102, 172, 0.6);
    background: rgba(12, 18, 32, 0.9);
    color: #e7efff;
    font-size: 1rem;
    text-align: center;
  }

  .modal-input:focus-visible {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }

  .stepper {
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    border: 1px solid rgba(72, 102, 172, 0.6);
    background: rgba(20, 30, 50, 0.9);
    color: #d7e2ff;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .stepper:active {
    transform: scale(0.96);
  }

  .stepper-icon__svg {
    width: 18px;
    height: 18px;
  }

  .modal-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .modal-actions__right {
    display: flex;
    gap: 10px;
  }

  .reset-button {
    height: 38px;
    flex: 0 0 auto;
  }
</style>
