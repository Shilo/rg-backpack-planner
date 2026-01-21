<script lang="ts">
  import { onDestroy } from "svelte";
  import { dismissToast, toastStore, type Toast } from "./toast";

  const timeouts = new Map<string, number>();

  function scheduleToast(toast: Toast) {
    if (timeouts.has(toast.id)) return;
    const timeoutId = window.setTimeout(() => {
      dismissToast(toast.id);
    }, toast.durationMs);
    timeouts.set(toast.id, timeoutId);
  }

  function clearToast(toastId: string) {
    const timeoutId = timeouts.get(toastId);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeouts.delete(toastId);
    }
  }

  const unsubscribe = toastStore.subscribe((toasts) => {
    toasts.forEach(scheduleToast);
    const activeIds = new Set(toasts.map((toast) => toast.id));
    for (const toastId of Array.from(timeouts.keys())) {
      if (!activeIds.has(toastId)) {
        clearToast(toastId);
      }
    }
  });

  onDestroy(() => {
    unsubscribe();
    for (const toastId of Array.from(timeouts.keys())) {
      clearToast(toastId);
    }
  });
</script>

<div class="toast-region" aria-live="polite" aria-atomic="true">
  {#each $toastStore as toast (toast.id)}
    <div
      class="toast toast--{toast.tone}"
      role="button"
      tabindex="0"
      on:click={() => dismissToast(toast.id)}
      on:keydown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          dismissToast(toast.id);
        }
      }}
    >
      <span class="toast__message">{toast.message}</span>
    </div>
  {/each}
</div>

<style>
  .toast-region {
    position: fixed;
    left: var(--bar-pad);
    bottom: calc(var(--bar-pad) + var(--tab-height) + 20px);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    z-index: 40;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    width: fit-content;
    border-radius: 10px;
    background: rgba(31, 45, 72, 0.96);
    border: 1px solid rgba(89, 118, 188, 0.6);
    box-shadow: 0 8px 20px rgba(9, 13, 25, 0.4);
    color: #e7efff;
    font-size: 0.9rem;
    line-height: 1.3;
  }

  .toast--negative {
    background: rgba(74, 18, 22, 0.96);
    border-color: rgba(208, 92, 92, 0.7);
    color: #ffe6e6;
  }

  .toast__message {
    flex: 1;
  }
</style>
