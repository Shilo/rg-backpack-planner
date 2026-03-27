<script lang="ts">
    import { onDestroy, onMount, tick } from "svelte";
    import { fly } from "svelte/transition";
    import {
        dismissToast,
        suppressedExitIds,
        toastStore,
        toastsPaused,
        type Toast,
    } from "./toast";
    import { prefersNoAnimations } from "./reduceMotionStore";
    import { triggerHaptic } from "./hapticsStore";
    import { CheckCircleIcon, WarningCircleIcon, XIcon } from "phosphor-svelte";
    import Spinner from "./Spinner.svelte";
    import { t } from "svelte-whisper";

    function toastExit(node: Element, { id }: { id: string }) {
        if (suppressedExitIds.has(id) || prefersNoAnimations()) {
            suppressedExitIds.delete(id);
            return { duration: 0 };
        }
        return fly(node, { y: 8, duration: 150 });
    }

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

    let regionEl: HTMLDivElement | null = null;
    let extraBottom = 0;
    const GAP = 8;

    const HUD_OVERLAP_SELECTORS = [".bot-right-actions", ".bot-left-actions"];

    function checkOverlap() {
        if (!regionEl) return;
        const toasts = regionEl.querySelectorAll<HTMLElement>(".toast");
        if (toasts.length === 0) {
            extraBottom = 0;
            return;
        }
        let maxShift = 0;
        for (const selector of HUD_OVERLAP_SELECTORS) {
            const el = document.querySelector<HTMLElement>(selector);
            if (!el) continue;
            const eb = el.getBoundingClientRect();
            if (eb.width === 0 || eb.height === 0) continue;
            toasts.forEach((toast) => {
                const tr = toast.getBoundingClientRect();
                const natTop = tr.top + extraBottom;
                const natBottom = tr.bottom + extraBottom;
                const hOverlap =
                    Math.min(tr.right, eb.right) - Math.max(tr.left, eb.left);
                const vOverlap =
                    Math.min(natBottom, eb.bottom) - Math.max(natTop, eb.top);
                if (hOverlap > 0 && vOverlap > 0) {
                    maxShift = Math.max(maxShift, vOverlap + GAP);
                }
            });
        }
        extraBottom = maxShift;
    }

    $: if ($toastStore.length > 0) {
        tick().then(checkOverlap);
    } else {
        extraBottom = 0;
    }

    let resizeRaf: number | null = null;
    function onResize() {
        if (resizeRaf !== null) return;
        resizeRaf = requestAnimationFrame(() => {
            resizeRaf = null;
            checkOverlap();
        });
    }

    onMount(() => {
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
            if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
        };
    });

    onDestroy(clearAllTimeouts);
</script>

{#snippet toastContent(toast: Toast)}
    <div class="toast__row">
        {#if toast.showIcon}
            <span class="toast__icon" aria-hidden="true">
                {#if toast.tone === "negative"}
                    <WarningCircleIcon size={18} weight="fill" />
                {:else}
                    <CheckCircleIcon size={18} weight="fill" />
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
{/snippet}

{#if !paused}
    <div
        class="toast-region"
        aria-live="polite"
        aria-atomic="true"
        bind:this={regionEl}
        style={extraBottom > 0 ? `--toast-extra-bottom: ${extraBottom}px` : ""}
    >
        {#each $toastStore as toast (toast.id)}
            {#if toast.action}
                <div
                    class="toast toast--{toast.tone} toast--has-action"
                    class:toast--permanent={toast.durationMs === 0}
                    style="--toast-duration: {toast.durationMs}ms"
                    out:toastExit={{ id: toast.id }}
                >
                    {@render toastContent(toast)}
                    <div class="toast__action-row">
                        <button
                            class="toast__dismiss"
                            aria-label={$t("common.dismiss")}
                            on:click|stopPropagation={() => {
                                triggerHaptic();
                                dismissToast(toast.id);
                            }}
                        >
                            <XIcon size={18} weight="bold" />
                        </button>
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
                </div>
            {:else}
                <button
                    class="toast toast--{toast.tone}"
                    class:toast--permanent={toast.durationMs === 0}
                    style="--toast-duration: {toast.durationMs}ms"
                    out:toastExit={{ id: toast.id }}
                    on:click={() => {
                        triggerHaptic();
                        dismissToast(toast.id);
                    }}
                >
                    {@render toastContent(toast)}
                </button>
            {/if}
        {/each}
    </div>
{/if}

<style>
    .toast-region {
        contain: layout style;
        position: fixed;
        left: 0;
        right: 0;
        bottom: calc(
            (
                    max(var(--bar-pad, 0px), var(--safe-bottom, 0px)) +
                        var(--tab-height, 0px)
                ) * (1 - var(--is-keyboard-open, 0)) + var(--spacing-lg) +
                var(--keyboard-height, 0px) + var(--toast-extra-bottom, 0px)
        );
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-md);
        z-index: var(--z-index-toast);
        pointer-events: none;
        transition: bottom 0.2s ease;
    }

    .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md) var(--spacing-lg);
        max-width: min(
            calc(
                100vw - 2 * var(--bar-pad) - var(--safe-left, 0px) -
                    var(--safe-right, 0px)
            ),
            360px
        );
        width: fit-content;
        border-radius: var(--radius-sm);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border-subtle);
        box-shadow: var(--shadow);
        color: var(--text-muted);
        font-size: var(--font-base);
        font-weight: var(--weight-semibold);
        line-height: var(--leading);
        animation: toast-enter 0.25s cubic-bezier(0.05, 0.7, 0.1, 1) both;
        overflow: hidden;
        position: relative;
    }

    .toast:not(.toast--has-action) {
        cursor: pointer;
    }

    button.toast {
        appearance: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
    }

    .toast--has-action {
        flex-direction: column;
        align-items: stretch;
        padding-bottom: 0;
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
        height: 2px;
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
        justify-content: space-between;
        align-items: center;
        margin: var(--spacing-xs) calc(-1 * var(--spacing-lg)) 0;
        padding: 0 var(--spacing-lg) var(--spacing-md);
    }

    .toast__dismiss {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: calc(-1 * var(--spacing-lg));
        margin-bottom: calc(-1 * var(--spacing-md));
        padding: var(--spacing-md) var(--spacing-lg) calc(2 * var(--spacing-md));
        border-radius: 0 var(--radius-sm) 0 var(--radius-sm);
        color: var(--text-muted);
        opacity: 0.6;
        transition:
            opacity 0.15s,
            background 0.15s;
    }

    @media (hover: hover) {
        .toast__dismiss:hover {
            opacity: 1;
            background: color-mix(in srgb, var(--text-muted) 10%, transparent);
        }
    }

    .toast__dismiss:active {
        opacity: 1;
    }

    .toast__action {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--radius-full);
        font-size: var(--font-xs);
        font-weight: var(--weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        white-space: nowrap;
        transition:
            opacity 0.15s,
            transform 0.15s;
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
