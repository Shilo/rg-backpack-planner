<!-- src/lib/buttons/MenuToggleButton.svelte -->
<script lang="ts">
    import { ListIcon, CloudArrowUpIcon, CloudWarningIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { CLOUD_SAVE_ENABLED } from "../../config/cloudSave";
    import { isCloudSyncing, isCloudSyncError } from "../cloudSyncStore";
    import { t } from "svelte-whisper";

    export let onClick: (() => void) | null = null;

    $: icon = (CLOUD_SAVE_ENABLED && $isCloudSyncError)
        ? CloudWarningIcon
        : (CLOUD_SAVE_ENABLED && $isCloudSyncing)
            ? CloudArrowUpIcon
            : ListIcon;
</script>

<Button
    class="menu-button"
    aria-label="Menu"
    tooltipText={$t("tree.menuButtonTooltip")}
    on:click={() => onClick?.()}
    {icon}
    iconClass="menu-button-icon {CLOUD_SAVE_ENABLED && $isCloudSyncing ? 'cloud-sync-icon--syncing' : ''}"
    iconSize={26}
/>
