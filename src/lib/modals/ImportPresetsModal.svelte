<script lang="ts">
    import { onMount } from "svelte";
    import type { Component } from "svelte";
    import { ClipboardIcon, FileArrowUpIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { showToast } from "../toast";
    import { triggerHaptic } from "../hapticsStore";
    import type { IconWeight } from "phosphor-svelte";
    import { t } from "svelte-whisper";
    import { scrollInputVisible } from "../viewportState";
    import {
        decodeSyncPayload,
        importPresetsFromFile,
        replaceAllPresets,
        mergePresets,
        type SyncPreset,
    } from "../deviceSync";
    import { buildPresetsStore } from "../buildPresetsStore";
    import { decodeBuildData } from "../buildData/encoder";
    import { applyBuildData } from "../buildData/applier";
    import { get } from "svelte/store";
    import { guardianTree } from "../../config/guardianTree";
    import { vanguardTree } from "../../config/vanguardTree";
    import { cannonTree } from "../../config/cannonTree";

    export let title = "";
    export let titleIcon: Component | null = null;
    export let titleIconClass = "";
    export let titleIconAriaHidden = true;
    export let titleIconWeight: IconWeight | undefined = undefined;
    export let message: string | undefined = undefined;
    export let cancelLabel = "";
    export let onImported: (() => void) | null = null;
    export let onCancel: (() => void) | null = null;

    const tabs = [
        { nodes: guardianTree },
        { nodes: vanguardTree },
        { nodes: cannonTree },
    ];

    let inputText = "";
    let inputEl: HTMLInputElement | null = null;
    let parsedPresets: SyncPreset[] | null = null;

    $: resolvedTitle = title || $t("deviceSync.importModalTitle");
    $: resolvedMessage = message ?? $t("deviceSync.importModalMessage");
    $: resolvedCancelLabel = cancelLabel || $t("common.cancel");
    $: parsedPresets = inputText.trim()
        ? decodeSyncPayload(inputText.trim())
        : null;

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

    async function handleFileImport() {
        triggerHaptic();
        const presets = await importPresetsFromFile();
        if (!presets) {
            showToast($t("deviceSync.invalidFileToast"), { tone: "negative" });
            return;
        }
        applyImport(presets, "merge");
    }

    function applyImport(incoming: SyncPreset[], strategy: "merge" | "replace") {
        const local = get(buildPresetsStore);
        const updated =
            strategy === "replace"
                ? replaceAllPresets(incoming)
                : mergePresets(local, incoming);

        buildPresetsStore.set(updated);

        const activePreset = updated.presets.find((p) => p.id === updated.active);
        if (activePreset) {
            const buildData = decodeBuildData(activePreset.buildCode);
            if (buildData) applyBuildData(tabs, buildData);
        }

        const count =
            strategy === "replace"
                ? incoming.length
                : updated.presets.length - local.presets.length;

        showToast(
            $t("deviceSync.importedToast", { count }),
        );
        onImported?.();
    }

    function handleMerge() {
        if (!parsedPresets) {
            showToast($t("deviceSync.invalidDataToast"), { tone: "negative" });
            inputEl?.focus();
            return;
        }
        applyImport(parsedPresets, "merge");
    }

    function handleReplace() {
        if (!parsedPresets) {
            showToast($t("deviceSync.invalidDataToast"), { tone: "negative" });
            inputEl?.focus();
            return;
        }
        applyImport(parsedPresets, "replace");
    }

    function handleFocus() {
        setTimeout(() => scrollInputVisible(inputEl), 300);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            handleMerge();
        }
    }

    onMount(() => {
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

    <label class="modal-label" for="import-presets-input">
        {$t("deviceSync.inputLabel")}
    </label>
    <div class="modal-input-row">
        <Button on:click={handlePasteClick} icon={ClipboardIcon}>
            {$t("common.paste")}
        </Button>
        <input
            id="import-presets-input"
            class="modal-input"
            bind:this={inputEl}
            type="text"
            placeholder={$t("deviceSync.inputPlaceholder")}
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            bind:value={inputText}
            on:keydown={handleKeydown}
            on:focus={handleFocus}
        />
    </div>

    {#if parsedPresets}
        <p class="modal-parsed-info">
            {$t("deviceSync.foundPresets", { count: parsedPresets.length })}
        </p>
    {/if}

    <Button
        on:click={handleFileImport}
        icon={FileArrowUpIcon}
        tooltipText={$t("deviceSync.importFromFileTooltip")}
    >
        {$t("deviceSync.importFromFile")}
    </Button>

    <div class="modal-actions">
        <Button data-modal-cancel on:click={handleCancel}>
            {resolvedCancelLabel}
        </Button>
        <Button
            on:click={handleReplace}
            disabled={!parsedPresets}
            negative
            tooltipText={$t("deviceSync.replaceAllTooltip")}
        >
            {$t("deviceSync.replaceAll")}
        </Button>
        <Button
            data-modal-confirm
            on:click={handleMerge}
            disabled={!parsedPresets}
            positive
            tooltipText={$t("deviceSync.mergeTooltip")}
        >
            {$t("deviceSync.merge")}
        </Button>
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

    .modal-parsed-info {
        margin: 0;
        font-size: var(--font-base);
        color: var(--success-text);
        line-height: 1.4;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--spacing-md);
        flex-wrap: wrap;
    }
</style>
