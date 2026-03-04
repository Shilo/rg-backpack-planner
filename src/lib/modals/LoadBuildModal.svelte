<script lang="ts">
    import { onMount } from "svelte";
    import type { Component } from "svelte";
    import { ClipboardIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { showToast } from "../toast";
    import {
        parseEncodedFromUserInput,
        navigateToEncodedBuild,
    } from "../buildData/url";
    import { triggerHaptic } from "../haptics";
    import type { IconWeight } from "phosphor-svelte";
    import { t } from "svelte-whisper";
    import { scrollInputVisible } from "../viewportState";

    export let title = "";
    export let titleIcon: Component | null = null;
    export let titleIconClass = "";
    export let titleIconAriaHidden = true;
    export let titleIconWeight: IconWeight | undefined = undefined;
    export let message: string | undefined = undefined;
    export let confirmLabel = "";
    export let cancelLabel = "";
    export let onLoaded: (() => void) | null = null;
    export let onCancel: (() => void) | null = null;

    let inputText = "";
    let isLoading = false;
    let inputEl: HTMLInputElement | null = null;
    $: resolvedTitle = title || $t("modal.loadBuild.title");
    $: resolvedMessage = message ?? $t("modal.loadBuild.message");
    $: resolvedConfirmLabel = confirmLabel || $t("modal.previewBuildLabel");
    $: resolvedCancelLabel = cancelLabel || $t("modal.cancelLabel");

    function handleCancel() {
        onCancel?.();
    }

    async function handlePasteClick() {
        triggerHaptic();
        if (
            !navigator.clipboard ||
            typeof navigator.clipboard.readText !== "function"
        ) {
            showToast($t("modal.loadBuild.clipboardUnavailableToast"), {
                tone: "negative",
            });
            return;
        }

        try {
            const text = await navigator.clipboard.readText();
            const trimmed = text.trim();
            if (!trimmed) {
                showToast($t("modal.loadBuild.clipboardEmptyToast"), {
                    tone: "negative",
                });
                return;
            }
            inputText = trimmed;
            // Move cursor to end for convenience
            queueMicrotask(() => {
                inputEl?.focus();
                inputEl?.setSelectionRange(inputText.length, inputText.length);
            });
        } catch {
            showToast($t("modal.loadBuild.clipboardReadFailedToast"), {
                tone: "negative",
            });
        }
    }

    async function handleLoad() {
        if (isLoading) return;

        const raw = inputText.trim();
        if (!raw) {
            showToast($t("modal.loadBuild.typeLinkOrCodeToast"), {
                tone: "negative",
            });
            inputEl?.focus();
            return;
        }

        isLoading = true;
        try {
            const encoded = parseEncodedFromUserInput(raw);
            if (!encoded) {
                showToast($t("modal.loadBuild.invalidLinkOrDataToast"), {
                    tone: "negative",
                });
                inputEl?.focus();
                return;
            }

            navigateToEncodedBuild(encoded);
            onLoaded?.();
        } finally {
            isLoading = false;
        }
    }

    function handleFocus() {
        setTimeout(() => scrollInputVisible(inputEl), 300);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            void handleLoad();
        }
    }

    onMount(() => {
        // Don't auto-focus on mobile/touch devices to avoid keyboard popup
        const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        if (!isCoarsePointer) {
            queueMicrotask(() => {
                inputEl?.focus();
                inputEl?.select();
            });
        }
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
                    weight={titleIconWeight}
                />
            {/if}
            <h2>{resolvedTitle}</h2>
        </div>
    </header>
    {#if resolvedMessage}
        <p class="modal-message">{resolvedMessage}</p>
    {/if}

    <label class="modal-label" for="load-build-input">
        {$t("modal.loadBuild.inputLabel")}
    </label>
    <div class="modal-input-row">
        <Button on:click={handlePasteClick} icon={ClipboardIcon}>
            {$t("common.paste")}
        </Button>
        <input
            id="load-build-input"
            class="modal-input"
            bind:this={inputEl}
            type="text"
            placeholder={$t("modal.loadBuild.placeholder")}
            inputmode="url"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            bind:value={inputText}
            on:keydown={handleKeydown}
            on:focus={handleFocus}
        />
    </div>

    <div class="modal-actions">
        <div class="modal-actions__row modal-actions__row--right">
            <Button data-modal-cancel on:click={handleCancel}>
                {resolvedCancelLabel}
            </Button>
            <Button
                data-modal-confirm
                on:click={() => handleLoad()}
                disabled={isLoading}
                positive
            >
                {resolvedConfirmLabel}
            </Button>
        </div>
    </div>
</div>

<style>
    .modal-content {
        display: grid;
        gap: var(--spacing-lg);
        padding: var(--spacing-md);
    }

    .modal-header {
        display: flex;
        align-items: center;
    }

    .modal-title {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .modal-header h2 {
        margin: 0;
        font-size: var(--font-lg);
        color: var(--text);
        line-height: var(--leading-none);
    }

    :global(.modal-title-icon) {
        width: 18px;
        height: 18px;
        color: var(--text-muted);
    }

    .modal-message {
        margin: 0;
        font-size: var(--font-base);
        color: var(--text-muted);
        line-height: 1.4;
        overflow-wrap: anywhere;
        word-break: break-word;
        hyphens: auto;
    }

    .modal-label {
        font-size: var(--font-base);
        color: var(--text-muted);
        letter-spacing: var(--tracking);
        text-transform: uppercase;
    }

    .modal-input-row {
        display: grid;
        grid-template-columns: minmax(0, 96px) minmax(0, 1fr);
        gap: var(--spacing-md);
        align-items: center;
    }

    .modal-input {
        width: 100%;
        height: 44px;
        border-radius: var(--radius);
        border: var(--border-width) solid var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-muted);
        font-size: var(--font-base);
        padding: 0 var(--spacing-md);
        text-transform: none;
    }

    .modal-input:focus-visible {
        outline: 2px solid var(--border-focus);
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
        gap: var(--spacing-lg);
    }

    .modal-actions__row {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
    }

    .modal-actions__row--right {
        justify-content: flex-end;
    }
</style>
