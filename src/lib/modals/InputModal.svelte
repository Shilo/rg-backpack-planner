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
  let modalShellEl: HTMLElement | null = null;

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

  function handleFocus() {
    // Give the virtual keyboard a moment to open before scrolling.
    setTimeout(() => {
      inputEl?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  }

  function updateKeyboardOffset() {
    if (!modalShellEl) return;
    const viewport = window.visualViewport;
    if (!viewport) {
      modalShellEl.style.removeProperty("--keyboard-offset");
      return;
    }
    const keyboardOffset = Math.max(
      0,
      window.innerHeight - (viewport.height + viewport.offsetTop),
    );
    modalShellEl.style.setProperty("--keyboard-offset", `${keyboardOffset}px`);
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
    modalShellEl = inputEl
      ? (inputEl.closest(".modal-shell") as HTMLElement | null)
      : null;
    updateKeyboardOffset();
    const viewport = window.visualViewport;
    const handleViewportChange = () => {
      updateKeyboardOffset();
    };
    viewport?.addEventListener("resize", handleViewportChange);
    viewport?.addEventListener("scroll", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    return () => {
      viewport?.removeEventListener("resize", handleViewportChange);
      viewport?.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      modalShellEl?.style.removeProperty("--keyboard-offset");
    };
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
      class="stepper stepper-icon reset-button"
      type="button"
      aria-label="Reset value"
      on:click={handleReset}
    >
      <RotateCcw class="stepper-icon__svg" aria-hidden="true" />
    </button>
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
      on:focus={handleFocus}
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
    <button
      class="stepper stepper-wide"
      type="button"
      aria-label="Increase value by 100"
      on:click={() => stepValue(100)}
    >
      +100
    </button>
  </div>
  <div class="modal-actions">
    <div class="modal-actions__right">
      <Button on:click={() => onCancel?.()}>{cancelLabel}</Button>
      <Button on:click={handleConfirm} positive>{confirmLabel}</Button>
    </div>
  </div>
</div>

<style>
  .modal-content {
    display: grid;
    gap: 12px;
    padding: 10px;
  }

  :global(.modal-shell) {
    transform: translateY(calc(-1 * var(--keyboard-offset, 0px) * 0.45));
    transition: transform 150ms ease;
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

  :global(.modal-title-icon-filled) {
    fill: currentColor;
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
    grid-template-columns: 44px 44px 1fr 44px 64px;
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
    font-size: 1.2rem;
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
  }

  .stepper:active {
    transform: scale(0.96);
  }

  :global(.stepper-icon__svg) {
    width: 18px;
    height: 18px;
  }

  .stepper-wide {
    width: 64px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
  }

  .modal-actions__right {
    display: flex;
    gap: 10px;
  }

  .reset-button {
    height: 44px;
    flex: 0 0 auto;
  }
</style>
