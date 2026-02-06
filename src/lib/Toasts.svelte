<script lang="ts">
    import { onDestroy } from "svelte";
    import { dismissToast, toastStore, type Toast } from "./toast";
    import { triggerHaptic } from "./haptics";

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
            on:click={() => {
                triggerHaptic();
                dismissToast(toast.id);
            }}
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
        z-index: var(--z-index-toast);
        pointer-events: none;
    }

    .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        width: fit-content;
        border-radius: var(--radius-sm);
        background: var(--bg-raised);
        border: 1px solid var(--border-strong);
        box-shadow: var(--shadow-md);
        color: var(--text-muted);
        font-size: var(--font-base);
        line-height: var(--leading-normal);
    }

    .toast--negative {
        background: var(--danger-bg);
        border-color: var(--danger-border);
        color: var(--danger-text);
    }

    .toast__message {
        flex: 1;
    }
</style>
