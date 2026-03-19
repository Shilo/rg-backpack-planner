<script lang="ts">
    import { onDestroy } from "svelte";
    import { fly } from "svelte/transition";
    import { dismissToast, toastStore, toastsPaused, type Toast } from "./toast";
    import { triggerHaptic } from "./hapticsStore";
    import { CheckCircleIcon, WarningCircleIcon } from "phosphor-svelte";
    import Spinner from "./Spinner.svelte";

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

    function clearAllTimeouts() {
        for (const toastId of Array.from(timeouts.keys())) {
            clearToast(toastId);
        }
    }

    $: paused = $toastsPaused;

    $: {
        if (paused) {
            clearAllTimeouts();
        } else {
            $toastStore.forEach(scheduleToast);
            const activeIds = new Set($toastStore.map((t) => t.id));
            for (const toastId of Array.from(timeouts.keys())) {
                if (!activeIds.has(toastId)) {
                    clearToast(toastId);
                }
            }
        }
    }

    onDestroy(clearAllTimeouts);
</script>

{#if !paused}
    <div class="toast-region" aria-live="polite" aria-atomic="true">
        {#each $toastStore as toast (toast.id)}
            <div
                class="toast toast--{toast.tone}"
                class:toast--permanent={toast.durationMs === 0}
                class:toast--has-action={toast.action}
                style="--toast-duration: {toast.durationMs}ms"
                role={toast.action ? undefined : "button"}
                tabindex={toast.action ? undefined : 0}
                out:fly={{ y: 8, duration: 150 }}
                on:click={() => {
                    if (toast.action) return;
                    triggerHaptic();
                    dismissToast(toast.id);
                }}
                on:keydown={(event) => {
                    if (toast.action) return;
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        dismissToast(toast.id);
                    }
                }}
            >
                <div class="toast__row">
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
                        <Spinner
                            tone={toast.tone === "negative" ? "negative" : "default"}
                        />
                    {/if}
                    <span class="toast__message">{toast.message}</span>
                </div>
                {#if toast.action}
                    <div class="toast__action-row">
                        <button
                            class="toast__action"
                            on:click|stopPropagation={() => {
                                triggerHaptic();
                                toast.action?.onClick();
                                dismissToast(toast.id);
                            }}
                        >
                            {toast.action.label}
                        </button>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}

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
            calc(
                100vw - 2 * var(--bar-pad) - var(--safe-left, 0px) -
                    var(--safe-right, 0px)
            ),
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
    }

    .toast:not(.toast--has-action) {
        cursor: pointer;
    }

    .toast--has-action {
        flex-direction: column;
        align-items: stretch;
        padding-bottom: var(--spacing-md);
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

    .toast__row {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
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

    .toast__message {
        flex: 1;
        white-space: pre-line;
    }

    .toast__action-row {
        display: flex;
        justify-content: flex-end;
        padding: var(--spacing-xs) 0 0 0;
    }

    .toast__action {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: 999px;
        font-size: var(--font-xs);
        font-weight: var(--weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        white-space: nowrap;
        transition: opacity 0.15s, transform 0.15s;
        color: var(--accent);
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 30%, transparent);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
    }

    .toast--negative .toast__action {
        color: var(--text);
        border-color: color-mix(in srgb, var(--text) 30%, transparent);
        background: color-mix(in srgb, var(--text) 8%, transparent);
    }

    @media (hover: hover) {
        .toast__action:hover {
            opacity: 0.85;
        }
    }

    .toast__action:active {
        opacity: 0.65;
        transform: scale(0.96);
    }
</style>
