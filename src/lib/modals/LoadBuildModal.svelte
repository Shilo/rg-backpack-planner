<script lang="ts">
  import { onMount } from "svelte";
  import { ClipboardIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import { showToast } from "../toast";
  import {
    parseEncodedFromUserInput,
    navigateToEncodedBuild,
  } from "../buildData/url";
  import { triggerHaptic } from "../haptics";

  export let title = "Load shareable build";
  export let message: string | undefined =
    "Paste a Backpack Planner link (https://...) or just the build code.";
  export let confirmLabel = "Load build";
  export let cancelLabel = "Cancel";
  export let onLoaded: (() => void) | null = null;
  export let onCancel: (() => void) | null = null;

  let inputText = "";
  let isLoading = false;
  let inputEl: HTMLInputElement | null = null;

  function handleCancel() {
    onCancel?.();
  }

  async function handlePasteClick() {
    triggerHaptic();
    if (
      !navigator.clipboard ||
      typeof navigator.clipboard.readText !== "function"
    ) {
      showToast("Clipboard not available", { tone: "negative" });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        showToast("Clipboard is empty", { tone: "negative" });
        return;
      }
      inputText = trimmed;
      // Move cursor to end for convenience
      queueMicrotask(() => {
        inputEl?.focus();
        inputEl?.setSelectionRange(inputText.length, inputText.length);
      });
    } catch {
      showToast("Unable to read from clipboard", { tone: "negative" });
    }
  }

  async function handleLoad() {
    if (isLoading) return;

    const raw = inputText.trim();
    if (!raw) {
      showToast("Paste a link or build code", { tone: "negative" });
      inputEl?.focus();
      return;
    }

    isLoading = true;
    try {
      const encoded = parseEncodedFromUserInput(raw);
      if (!encoded) {
        showToast("Invalid link or build data", { tone: "negative" });
        inputEl?.focus();
        return;
      }

      navigateToEncodedBuild(encoded);
      onLoaded?.();
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleLoad();
    }
  }

  onMount(() => {
    queueMicrotask(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  });
</script>

<div class="modal-content">
  <header class="modal-header">
    <div class="modal-title">
      <h2>{title}</h2>
    </div>
  </header>
  {#if message}
    <p class="modal-message">{message}</p>
  {/if}

  <label class="modal-label" for="load-build-input">
    Share link or build code
  </label>
  <div class="modal-input-row">
    <Button on:click={handlePasteClick} icon={ClipboardIcon}>Paste</Button>
    <input
      id="load-build-input"
      class="modal-input"
      bind:this={inputEl}
      type="text"
      placeholder="https://.../1;,2;,,3"
      inputmode="url"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      bind:value={inputText}
      on:keydown={handleKeydown}
    />
  </div>

  <div class="modal-actions">
    <div class="modal-actions__row modal-actions__row--right">
      <Button on:click={handleCancel}>{cancelLabel}</Button>
      <Button on:click={handleLoad} disabled={isLoading} positive>
        {confirmLabel}
      </Button>
    </div>
  </div>
</div>

<style>
  .modal-content {
    display: grid;
    gap: 12px;
    padding: 10px;
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
    grid-template-columns: minmax(0, 96px) minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }

  .modal-input {
    width: 100%;
    height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(72, 102, 172, 0.6);
    background: rgba(12, 18, 32, 0.9);
    color: #e7efff;
    font-size: 0.96rem;
    padding: 0 10px;
    text-transform: none;
  }

  .modal-input:focus-visible {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }

  .modal-input-row :global(button) {
    height: 44px;
    min-width: 0;
    white-space: nowrap;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
  }
</style>
