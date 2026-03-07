<script lang="ts">
    import { onMount } from "svelte";
    import {
        CopyIcon,
        ClipboardIcon,
        CheckIcon,
        DeviceMobileIcon,
    } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { showToast } from "../toast";
    import { exportSyncCode, importSyncCode } from "../syncUtil";
    import { triggerHaptic } from "../haptics";
    import { t } from "svelte-whisper";
    import { closeModal } from "../modalStore";

    export let title = "";
    export let message: string | undefined = undefined;

    let syncCode = "";
    let importText = "";
    let isCopied = false;
    let inputEl: HTMLInputElement | null = null;
    let isImporting = false;

    $: resolvedTitle = title || $t("modal.sync.title");
    $: resolvedMessage = message ?? $t("modal.sync.message");

    onMount(() => {
        syncCode = exportSyncCode();
    });

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(syncCode);
            isCopied = true;
            triggerHaptic();
            showToast($t("modal.sync.copySuccessToast"));
            setTimeout(() => (isCopied = false), 2000);
        } catch {
            showToast($t("toast.unableToCopy"), { tone: "negative" });
        }
    }

    async function handlePaste() {
        try {
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                showToast($t("modal.loadBuild.clipboardUnavailableToast"), {
                    tone: "negative",
                });
                return;
            }
            const text = await navigator.clipboard.readText();
            importText = text.trim();
            triggerHaptic();
        } catch {
            showToast($t("modal.loadBuild.clipboardReadFailedToast"), {
                tone: "negative",
            });
        }
    }

    function handleImport() {
        const code = importText.trim();
        if (!code) return;

        isImporting = true;
        const success = importSyncCode(code);
        if (success) {
            triggerHaptic();
            showToast($t("modal.sync.importSuccessToast"));
            // Reload page to apply everything cleanly
            setTimeout(() => {
                window.location.reload();
            }, 600);
        } else {
            showToast($t("modal.sync.importFailedToast"), { tone: "negative" });
            isImporting = false;
        }
    }
</script>

<div class="modal-content">
    <header class="modal-header">
        <div class="modal-title">
            <DeviceMobileIcon size={20} class="modal-title-icon" />
            <h2>{resolvedTitle}</h2>
        </div>
    </header>

    {#if resolvedMessage}
        <p class="modal-message">{resolvedMessage}</p>
    {/if}

    <div class="sync-sections">
        <section class="sync-section">
            <label class="modal-label" for="export-code"
                >{$t("modal.sync.exportLabel")}</label
            >
            <div class="sync-input-group">
                <input
                    id="export-code"
                    class="modal-input readonly-input"
                    type="text"
                    readonly
                    value={syncCode}
                    on:click={(e) =>
                        (e.currentTarget as HTMLInputElement).select()}
                />
                <Button
                    on:click={handleCopy}
                    icon={isCopied ? CheckIcon : CopyIcon}
                    class="sync-btn"
                >
                    {isCopied ? $t("toast.copied") : $t("common.copy")}
                </Button>
            </div>
        </section>

        <section class="sync-section">
            <label class="modal-label" for="import-code"
                >{$t("modal.sync.importLabel")}</label
            >
            <div class="sync-input-group">
                <input
                    id="import-code"
                    bind:this={inputEl}
                    class="modal-input"
                    type="text"
                    placeholder={$t("modal.sync.importPlaceholder")}
                    bind:value={importText}
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                />
                <Button
                    on:click={handlePaste}
                    icon={ClipboardIcon}
                    class="sync-btn"
                >
                    {$t("common.paste")}
                </Button>
            </div>
        </section>
    </div>

    <div class="modal-actions">
        <Button on:click={closeModal}>{$t("common.close")}</Button>
        <Button
            on:click={handleImport}
            disabled={!importText.trim() || isImporting}
            positive
        >
            {$t("modal.sync.importConfirmLabel")}
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
        color: var(--text-muted);
    }

    .modal-message {
        margin: 0;
        font-size: var(--font-base);
        color: var(--text-muted);
        line-height: 1.4;
    }

    .sync-sections {
        display: grid;
        gap: var(--spacing-lg);
    }

    .sync-section {
        display: grid;
        gap: var(--spacing-xs);
    }

    .modal-label {
        font-size: var(--font-xs);
        color: var(--text-muted);
        letter-spacing: var(--tracking);
        text-transform: uppercase;
    }

    .sync-input-group {
        display: flex;
        gap: var(--spacing-sm);
    }

    .modal-input {
        flex: 1;
        height: 40px;
        border-radius: var(--radius);
        border: var(--border-width) solid var(--border-subtle);
        background: var(--bg-input);
        color: var(--text);
        font-size: var(--font-sm);
        padding: 0 var(--spacing-md);
        min-width: 0;
    }

    .readonly-input {
        background: var(--bg-raised);
        color: var(--text-muted);
        cursor: text;
    }

    .modal-input:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    :global(.sync-btn) {
        width: 100px;
        flex-shrink: 0;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--spacing-md);
        margin-top: var(--spacing-sm);
    }

    .modal-actions :global(button) {
        min-width: 100px;
    }
</style>
