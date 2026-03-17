<!-- src/lib/cloudSync/CloudSyncIndicator.svelte -->
<script lang="ts">
    import { CloudArrowUpIcon, CloudCheckIcon, CloudWarningIcon } from "phosphor-svelte";
    import { isCloudSyncEnabled, isCloudSyncing, isCloudSyncError } from "../cloudSyncStore";

    export let size: number | string = 26;
    export let showIdleState = false;

    $: syncing = $isCloudSyncing;
    $: error = $isCloudSyncError;
    $: enabled = $isCloudSyncEnabled;
</script>

{#if error}
    <CloudWarningIcon {size} class="cloud-sync-icon cloud-sync-icon--error" />
{:else if syncing}
    <CloudArrowUpIcon {size} class="cloud-sync-icon cloud-sync-icon--syncing" />
{:else if enabled && showIdleState}
    <CloudCheckIcon {size} class="cloud-sync-icon cloud-sync-icon--idle" />
{/if}

<style>
    :global(.cloud-sync-icon--syncing) {
        animation: cloud-sync-pulse 0.8s ease-in-out;
    }

    @media (prefers-reduced-motion: reduce) {
        :global(.cloud-sync-icon--syncing) {
            animation: none;
        }
    }

    @keyframes cloud-sync-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    :global(.cloud-sync-icon--error) {
        color: var(--danger-text);
    }
</style>
