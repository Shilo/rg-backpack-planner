<script lang="ts">
    import ShareBuildButton from "./buttons/ShareBuildButton.svelte";
    import Button from "./Button.svelte";
    import ButtonGroup from "./ButtonGroup.svelte";
    import { EyeSlashIcon, ScalesIcon } from "phosphor-svelte";
    import { navigateToPersonalMode } from "./buildData/url";
    import TechCrystalsButton from "./buttons/TechCrystalsButton.svelte";
    import CloneBuildButton from "./buttons/CloneBuildButton.svelte";
    import { showToast } from "./toast";
    import { previewBuildName } from "./previewBuildNameStore";
    import { activePresetName } from "./buildPresetsStore";
    import { getDisplayPresetName } from "./i18n";
    import { truncateText } from "./stringUtil";
    import { t } from "svelte-whisper";

    /** Called when the compare button is clicked with the anchor position. */
    export let onCompareOpen: ((x: number, y: number) => void) | null = null;

    function handleCompareClick(event: CustomEvent<MouseEvent> | MouseEvent) {
        const mouseEvent = event instanceof CustomEvent ? event.detail : event;
        const target = mouseEvent.currentTarget as HTMLElement | null;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        onCompareOpen?.(rect.left + rect.width / 2, rect.bottom + 8);
    }

    function handleStopPreview() {
        const name = truncateText(getDisplayPresetName($activePresetName));
        navigateToPersonalMode();
        showToast($t("preview.backToBuildToast", { name }));
    }
</script>

<TechCrystalsButton tooltipSubject={$t("techCrystals.subjectPreview")} />
<ShareBuildButton
    title={$t("preview.sharePreviewBuild")}
    description={$t("preview.sharePreviewBuildDescription")}
    tooltipSubject={$t("techCrystals.subjectPreview")}
    buildName={$previewBuildName}
/>
<ButtonGroup fill>
    <CloneBuildButton description={$t("preview.clonePreviewBuildDescription")} />
    <Button
        on:click={handleCompareClick}
        icon={ScalesIcon}
        description={$t("compare.compareWithDescription")}
        arrow="right"
    >
        {$t("compare.compareWith")}
    </Button>
</ButtonGroup>
<Button
    on:click={handleStopPreview}
    description={$t("preview.stopPreviewDescription")}
    icon={EyeSlashIcon}
    negative
>
    {$t("preview.stopPreview")}
</Button>
