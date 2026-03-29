<script lang="ts">
    import ShareBuildButton from "./buttons/ShareBuildButton.svelte";
    import Button from "./Button.svelte";
    import { EyeSlashIcon, ScalesIcon } from "phosphor-svelte";
    import { clearShareFromUrl } from "./buildData/url";
    import TechCrystalsButton from "./buttons/TechCrystalsButton.svelte";
    import CloneBuildButton from "./buttons/CloneBuildButton.svelte";
    import { queueStoppedPreviewToast } from "./toast";
    import { previewBuildName } from "./previewBuildNameStore";
    import { t } from "svelte-whisper";
    import CompareBuildsMenu from "./compare/CompareBuildsMenu.svelte";

    let compareMenuOpen = false;
    let compareMenuX = 0;
    let compareMenuY = 0;

    function handleCompareClick(event: CustomEvent<MouseEvent> | MouseEvent) {
        const mouseEvent = event instanceof CustomEvent ? event.detail : event;
        const target = mouseEvent.currentTarget as HTMLElement | null;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        compareMenuX = rect.left + rect.width / 2;
        compareMenuY = rect.bottom + 8;
        compareMenuOpen = true;
    }

    function closeCompareMenu() {
        compareMenuOpen = false;
    }

    function handleStopPreview() {
        // Remove build data from URL and reload to switch to personal mode
        // This ensures a clean state transition with proper initialization
        if (typeof window !== "undefined") {
            // Set a flag to show toast after reload
            queueStoppedPreviewToast();

            // Clear share data from URL, leaving only base path
            // Use pushState to preserve share link in history for back button
            clearShareFromUrl(false);

            // Reload to re-initialize in personal mode
            window.location.reload();
        }
    }
</script>

<TechCrystalsButton tooltipSubject={$t("techCrystals.subjectPreview")} />
<ShareBuildButton
    title={$t("preview.sharePreviewBuild")}
    description={$t("preview.sharePreviewBuildDescription")}
    tooltipSubject={$t("techCrystals.subjectPreview")}
    buildName={$previewBuildName}
/>
<CloneBuildButton description={$t("preview.clonePreviewBuildDescription")} />
<Button
    on:click={handleCompareClick}
    icon={ScalesIcon}
    arrow="right"
>
    {$t("compare.compareWith")}
</Button>
<CompareBuildsMenu
    x={compareMenuX}
    y={compareMenuY}
    isOpen={compareMenuOpen}
    onClose={closeCompareMenu}
/>
<Button
    on:click={handleStopPreview}
    description={$t("preview.stopPreviewDescription")}
    icon={EyeSlashIcon}
    negative
>
    {$t("preview.stopPreview")}
</Button>
