<script module lang="ts">
    import { writable } from "svelte/store";

    export const isComposeScreenshotOpen = writable(false);

    export function openComposeScreenshot() {
        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("closeSideMenu"));
        }
        isComposeScreenshotOpen.set(true);
    }

    export function closeComposeScreenshot() {
        isComposeScreenshotOpen.set(false);
    }
</script>

<script lang="ts">
    let ComposeScreenshotContent: any = null;
    let loadPromise: Promise<void> | null = null;

    async function ensureContentLoaded() {
        if (ComposeScreenshotContent || loadPromise) {
            await loadPromise;
            return;
        }

        loadPromise = import("./ComposeScreenshotContent.svelte")
            .then((module) => {
                ComposeScreenshotContent = module.default;
            })
            .finally(() => {
                loadPromise = null;
            });

        await loadPromise;
    }

    $: if ($isComposeScreenshotOpen) {
        void ensureContentLoaded();
    }
</script>

{#if $isComposeScreenshotOpen && ComposeScreenshotContent}
    <svelte:component
        this={ComposeScreenshotContent}
        isOpen={$isComposeScreenshotOpen}
        onClose={closeComposeScreenshot}
    />
{/if}
