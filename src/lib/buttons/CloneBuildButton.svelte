<script lang="ts">
    import type { Component } from "svelte";
    import { CopySimpleIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { get } from "svelte/store";
    import { treeLevels } from "../treeLevelsStore";
    import { techCrystalsOwned } from "../techCrystalStore";
    import {
        addPreset,
        getUniquePresetName,
        setActivePresetId,
    } from "../buildPresetsStore";
    import { encodeBuildData } from "../buildData/encoder";
    import { showToast, queueClonedBuildToast } from "../toast";
    import { clearShareFromUrl } from "../buildData/url";
    import { openModal } from "../modalStore";
    import { previewBuildName } from "../previewBuildNameStore";
    import { truncateText } from "../stringUtil";
    import { t } from "svelte-whisper";
    import { getDisplayPresetName } from "../i18n";

    function handleCloneBuild() {
        const previewName = get(previewBuildName) ?? "";
        const uniqueName = getUniquePresetName(
            previewName,
            "Clone",
        );
        openModal({
            type: "confirm",
            title: $t("preview.cloneModalTitle"),
            titleIcon: CopySimpleIcon as unknown as Component,
            message: $t("preview.cloneModalMessage", {
                name: truncateText(getDisplayPresetName(uniqueName)),
            }),
            confirmLabel: $t("preview.cloneConfirmLabel"),
            cancelLabel: $t("common.cancel"),
            confirmPositive: true,
            onConfirm: () => {
                try {
                    const currentTreeLevels = get(treeLevels);
                    const currentTechCrystalsOwned = get(techCrystalsOwned);
                    const buildCode = encodeBuildData({
                        trees: currentTreeLevels,
                        owned: currentTechCrystalsOwned,
                    });
                    const preset = addPreset(uniqueName, buildCode);
                    setActivePresetId(preset.id);

                    if (typeof window !== "undefined") {
                        queueClonedBuildToast(uniqueName);
                        clearShareFromUrl(false);
                        window.location.reload();
                    }
                } catch (error) {
                    console.error("Failed to clone build:", error);
                    showToast($t("preview.failedCloneToast"), {
                        tone: "negative",
                    });
                }
            },
        });
    }
</script>

<Button
    on:click={handleCloneBuild}
    tooltipText={$t("preview.clonePreviewBuildTooltip")}
    icon={CopySimpleIcon}
>
    {$t("preview.clonePreviewBuild")}
</Button>
