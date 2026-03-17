<script lang="ts">
    import type { Component } from "svelte";
    import {
        ArrowsClockwiseIcon,
        SignOutIcon,
        TrashSimpleIcon,
        UserCircleIcon,
    } from "phosphor-svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { cloudSyncStore } from "../cloudSyncStore";
    import { openModal } from "../modalStore";
    import { t } from "svelte-whisper";

    export let isOpen = false;
    export let x = 0;
    export let y = 0;
    export let onClose: (() => void) | null = null;

    function formatRelativeTime(timestamp: number | null): string {
        if (!timestamp) return "";
        const diff = Math.floor((Date.now() - timestamp) / 1000);
        if (diff < 60) return $t("cloudSave.justNow");
        if (diff < 3600) return $t("cloudSave.minutesAgo", { count: Math.floor(diff / 60) });
        return $t("cloudSave.hoursAgo", { count: Math.floor(diff / 3600) });
    }

    async function handleSyncNow() {
        const { forceSyncNow } = await import("./service");
        await forceSyncNow();
        onClose?.();
    }

    async function handleSignOut() {
        const { stopCloudSync } = await import("./service");
        const { signOut } = await import("./auth");
        await signOut();
        await stopCloudSync();
        onClose?.();
    }

    function handleDeleteCloudData() {
        openModal({
            type: "confirm",
            title: $t("cloudSave.deleteConfirmTitle"),
            titleIcon: TrashSimpleIcon as unknown as Component,
            message: $t("cloudSave.deleteConfirmMessage"),
            confirmLabel: $t("cloudSave.deleteConfirmLabel"),
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            onConfirm: async () => {
                const { deleteCloudData } = await import("./service");
                await deleteCloudData();
                onClose?.();
            },
        });
    }

    $: lastSyncedText = $cloudSyncStore.lastSyncedAt
        ? $t("cloudSave.lastSynced", { time: formatRelativeTime($cloudSyncStore.lastSyncedAt) })
        : "";
    $: buildsSyncedText = $cloudSyncStore.presetCount !== null
        ? $t("cloudSave.buildsSynced", { count: $cloudSyncStore.presetCount })
        : "";
    $: revisionText = $cloudSyncStore.revision !== null
        ? $t("cloudSave.revision", { number: $cloudSyncStore.revision })
        : "";
    $: isSyncing = $cloudSyncStore.status === "syncing";
</script>

<ContextMenu
    {x}
    {y}
    {isOpen}
    ariaLabel={$t("cloudSave.label")}
    {onClose}
    anchorAbove={true}
>
    <div class="cloud-save-menu">
        <!-- Profile section -->
        <div class="profile-section">
            <div class="avatar-wrap">
                {#if $cloudSyncStore.userPhotoUrl}
                    <img
                        class="avatar"
                        src={$cloudSyncStore.userPhotoUrl}
                        alt={$cloudSyncStore.userDisplayName ?? ""}
                        referrerpolicy="no-referrer"
                    />
                {:else}
                    <UserCircleIcon class="avatar-fallback" size={32} aria-hidden={true} />
                {/if}
            </div>
            <div class="profile-info">
                {#if $cloudSyncStore.userDisplayName}
                    <span class="display-name">{$cloudSyncStore.userDisplayName}</span>
                {/if}
                {#if $cloudSyncStore.userEmail}
                    <span class="email">{$cloudSyncStore.userEmail}</span>
                {/if}
            </div>
        </div>

        <!-- Sync info section -->
        {#if lastSyncedText || buildsSyncedText || revisionText}
            <div class="sync-info">
                {#if lastSyncedText}
                    <span class="sync-meta">{lastSyncedText}</span>
                {/if}
                {#if buildsSyncedText}
                    <span class="sync-meta">{buildsSyncedText}</span>
                {/if}
                {#if revisionText}
                    <span class="sync-meta">{revisionText}</span>
                {/if}
            </div>
        {/if}

        <!-- Actions -->
        <div class="actions">
            <button
                class="action-btn"
                type="button"
                disabled={isSyncing}
                on:click={handleSyncNow}
            >
                <ArrowsClockwiseIcon
                    class="action-icon"
                    size={16}
                    aria-hidden={true}
                />
                {$t("cloudSave.syncNow")}
            </button>
            <button
                class="action-btn"
                type="button"
                on:click={handleSignOut}
            >
                <SignOutIcon
                    class="action-icon"
                    size={16}
                    aria-hidden={true}
                />
                {$t("cloudSave.signOut")}
            </button>
            <button
                class="action-btn action-btn--danger"
                type="button"
                on:click={handleDeleteCloudData}
            >
                <TrashSimpleIcon
                    class="action-icon"
                    size={16}
                    aria-hidden={true}
                />
                {$t("cloudSave.deleteCloudData")}
            </button>
        </div>

        <!-- Footer -->
        <p class="footer-note">{$t("cloudSave.signOutFooter")}</p>
    </div>
</ContextMenu>

<style>
    .cloud-save-menu {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        width: 220px;
    }

    /* Profile section */
    .profile-section {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-xs) 0;
    }

    .avatar-wrap {
        flex: 0 0 auto;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        object-fit: cover;
        border: var(--border-width) solid var(--border);
    }

    :global(.avatar-fallback) {
        color: var(--text-disabled);
    }

    .profile-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .display-name {
        font-size: var(--font-base);
        font-weight: var(--weight-semibold);
        color: var(--text);
        line-height: var(--leading-none);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .email {
        font-size: var(--font-xs);
        color: var(--text-disabled);
        line-height: var(--leading-none);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Sync info */
    .sync-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: var(--spacing-xs) 0;
        border-top: var(--border-width) solid var(--border-subtle);
    }

    .sync-meta {
        font-size: var(--font-xs);
        color: var(--text-disabled);
        line-height: var(--leading);
    }

    /* Actions */
    .actions {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        border-top: var(--border-width) solid var(--border-subtle);
        padding-top: var(--spacing-xs);
    }

    .action-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-sm);
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-size: var(--font-base);
        border-radius: var(--radius-sm);
        text-align: left;
        cursor: pointer;
        transition: background var(--ease), color var(--ease);
        line-height: var(--leading-none);
        width: 100%;
    }

    .action-btn:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
    }

    @media (hover: hover) {
        .action-btn:not(:disabled):hover {
            background: var(--bg-raised);
            color: var(--text);
        }
    }

    .action-btn:not(:disabled):active {
        background: var(--bg-raised);
        color: var(--text);
        transform: scale(0.97);
    }

    .action-btn--danger {
        color: var(--danger-text);
    }

    @media (hover: hover) {
        .action-btn--danger:not(:disabled):hover {
            background: var(--danger-bg);
            color: var(--danger-text);
        }
    }

    .action-btn--danger:not(:disabled):active {
        background: var(--danger-bg);
        color: var(--danger-text);
    }

    :global(.action-icon) {
        flex: 0 0 auto;
    }

    /* Footer note */
    .footer-note {
        margin: 0;
        font-size: var(--font-xs);
        color: var(--text-disabled);
        line-height: var(--leading);
        border-top: var(--border-width) solid var(--border-subtle);
        padding-top: var(--spacing-sm);
    }
</style>
