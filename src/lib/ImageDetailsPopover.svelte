<script lang="ts">
    import ContextMenu from "./ContextMenu.svelte";
    import { portal } from "./portal";
    import { t } from "svelte-whisper";

    export let isOpen = false;
    export let x = 0;
    export let y = 0;
    export let onClose: (() => void) | null = null;
    export let filename = "";
    export let naturalWidth = 0;
    export let naturalHeight = 0;
    export let fileSize = 0;
    export let mimeType = "";

    function formatFileSize(bytes: number): string {
        if (bytes <= 0) return "0 B";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatMimeType(type: string): string {
        const map: Record<string, string> = {
            "image/png": "PNG",
            "image/webp": "WebP",
            "image/jpeg": "JPEG",
        };
        return map[type] ?? type;
    }

    $: dpr =
        typeof window !== "undefined" ? window.devicePixelRatio : 1;
</script>

<div hidden>
    <div
        use:portal
        class="image-details-portal"
        class:portal-open={isOpen}
    >
        <ContextMenu
            {x}
            {y}
            {isOpen}
            title={$t("compose.imageDetails.title")}
            ariaLabel={$t("compose.imageDetails.title")}
            {onClose}
        >
            <div class="image-details">
                <div class="image-details__row">
                    <span class="image-details__label"
                        >{$t("compose.imageDetails.name")}</span
                    >
                    <span class="image-details__value">{filename}</span>
                </div>
                <div class="image-details__row">
                    <span class="image-details__label"
                        >{$t("compose.imageDetails.resolution")}</span
                    >
                    <span class="image-details__value"
                        >{naturalWidth} &times; {naturalHeight}</span
                    >
                </div>
                <div class="image-details__row">
                    <span class="image-details__label"
                        >{$t("compose.imageDetails.fileSize")}</span
                    >
                    <span class="image-details__value"
                        >{formatFileSize(fileSize)}</span
                    >
                </div>
                <div class="image-details__row">
                    <span class="image-details__label"
                        >{$t("compose.imageDetails.format")}</span
                    >
                    <span class="image-details__value"
                        >{formatMimeType(mimeType)}</span
                    >
                </div>
                <div class="image-details__row">
                    <span class="image-details__label"
                        >{$t("compose.imageDetails.dpr")}</span
                    >
                    <span class="image-details__value">{dpr}x</span>
                </div>
            </div>
        </ContextMenu>
    </div>
</div>

<style>
    .image-details-portal {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: var(--z-index-context-menu-over-modal);
    }

    .image-details-portal.portal-open {
        pointer-events: auto;
    }

    :global(.image-details-portal .context-menu) {
        z-index: var(--z-index-context-menu-over-modal);
    }

    :global(.image-details-portal .context-menu-backdrop) {
        z-index: calc(var(--z-index-context-menu-over-modal) - 1);
    }

    .image-details {
        display: grid;
        gap: var(--spacing-sm);
        min-width: 180px;
    }

    .image-details__row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--spacing-lg);
    }

    .image-details__label {
        font-size: var(--font-sm);
        color: var(--text-muted);
        white-space: nowrap;
    }

    .image-details__value {
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        color: var(--text);
        text-align: right;
        word-break: break-all;
    }
</style>
