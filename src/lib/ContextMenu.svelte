<script lang="ts">
  import { onMount } from "svelte";

  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let ariaLabel = "Context menu";
  export let onClose: (() => void) | null = null;

  let menuEl: HTMLDivElement | null = null;

  function handleDocumentPointer(event: PointerEvent) {
    if (!isOpen) return;
    const target = event.target;
    if (target instanceof Node && menuEl?.contains(target)) return;
    onClose?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  onMount(() => {
    document.addEventListener("pointerdown", handleDocumentPointer, {
      capture: true,
    });
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointer, {
        capture: true,
      });
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

{#if isOpen}
  <div
    class="context-menu"
    bind:this={menuEl}
    style={`left: ${x}px; top: ${y}px;`}
    role="menu"
    aria-label={ariaLabel}
  >
    <slot />
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    transform: translate(-50%, -10%);
    background: #0f192b;
    border: 1px solid #2f3f66;
    border-radius: 10px;
    padding: 8px;
    display: grid;
    gap: 6px;
    z-index: 20;
  }

  :global(.context-menu button) {
    background: #1c2b4a;
    border: 1px solid #33456e;
    color: #e7efff;
    font-size: 0.75rem;
    padding: 6px 10px;
    border-radius: 8px;
  }

  :global(.context-menu button:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
