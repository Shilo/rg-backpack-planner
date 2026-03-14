<script lang="ts">
    import { onDestroy } from "svelte";
    import { fly } from "svelte/transition";
    import { dismissToast, toastStore, type Toast } from "./toast";
    import { triggerHaptic } from "./hapticsStore";
    import { CheckCircleIcon, WarningCircleIcon } from "phosphor-svelte";

    const timeouts = new Map<string, number>();

    function scheduleToast(toast: Toast) {
        if (timeouts.has(toast.id) || toast.durationMs === 0) return;
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
            class:toast--permanent={toast.durationMs === 0}
            style="--toast-duration: {toast.durationMs}ms"
            role="button"
            tabindex="0"
            out:fly={{ y: 8, duration: 150 }}
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
            {#if toast.showIcon}
                <span class="toast__icon" aria-hidden="true">
                    {#if toast.tone === "negative"}
                        <WarningCircleIcon size={20} weight="fill" />
                    {:else}
                        <CheckCircleIcon size={20} weight="fill" />
                    {/if}
                </span>
            {/if}
            {#if toast.showSpinner}
                <span class="toast__spinner" aria-hidden="true"></span>
            {/if}
            <span class="toast__message">{toast.message}</span>
        </div>
    {/each}
</div>

<style>
    .toast-region {
        position: fixed;
        left: 0;
        right: 0;
        bottom: calc(
            (var(--bar-pad, 0px) + var(--tab-height, 0px)) *
                (1 - var(--is-keyboard-open, 0)) + var(--spacing-lg) +
                var(--keyboard-height, 0px) + var(--safe-bottom, 0px)
        );
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-lg);
        z-index: var(--z-index-toast);
        pointer-events: none;
        transition: bottom 0.2s ease;
    }

    .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-lg) calc(var(--spacing-lg) + var(--spacing-md));
        max-width: min(
            calc(100vw - 2 * var(--bar-pad) - var(--safe-left, 0px) - var(--safe-right, 0px)),
            400px
        );
        width: fit-content;
        border-radius: var(--radius);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border-subtle);
        box-shadow: var(--shadow);
        color: var(--text-muted);
        font-size: var(--font-lg);
        font-weight: var(--weight-bold);
        line-height: var(--leading);
        animation: toast-enter 0.25s cubic-bezier(0.05, 0.7, 0.1, 1) both;
        overflow: hidden;
        position: relative;
        cursor: pointer;
    }

    .toast--negative {
        background: var(--danger-bg);
        border-color: var(--danger-border);
        color: var(--danger-text);
        animation-name: toast-enter-negative;
        animation-duration: 0.2s;
    }

    .toast::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
        transform-origin: left;
        animation: toast-progress var(--toast-duration, 3s) linear forwards;
    }

    .toast--negative::after {
        background: var(--danger-border);
    }

    .toast--permanent::after {
        display: none;
    }

    .toast__icon {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        color: var(--accent);
    }

    .toast--negative .toast__icon {
        color: var(--danger-text);
    }

    .toast__spinner {
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
        border-radius: 999px;
        border: 2px solid
            color-mix(in srgb, var(--text-muted) 22%, transparent);
        border-top-color: var(--accent);
        animation: toast-spinner 0.75s linear infinite;
    }

    .toast--negative .toast__spinner {
        border-color: color-mix(in srgb, var(--danger-text) 22%, transparent);
        border-top-color: var(--danger-text);
    }

    .toast__message {
        flex: 1;
    }

    @keyframes toast-spinner {
        to {
            transform: rotate(360deg);
        }
    }
</style>
