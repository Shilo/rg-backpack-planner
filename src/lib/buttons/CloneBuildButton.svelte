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

    function handleCloneBuild() {
        const previewName = get(previewBuildName) ?? "";
        const uniqueName = getUniquePresetName(previewName, "Clone");
        openModal({
            type: "confirm",
            title: "CLONE PREVIEW BUILD",
            titleIcon: CopySimpleIcon as unknown as Component,
            message: `create a new preset named "${truncateText(uniqueName)}" from the preview build.`,
            confirmLabel: "Clone",
            cancelLabel: "Cancel",
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
                    showToast("Failed to clone build", { tone: "negative" });
                }
            },
        });
    }
</script>

<Button
    on:click={handleCloneBuild}
    tooltipText={"Copy preview build to personal build"}
    icon={CopySimpleIcon}
>
    Clone Preview Build
</Button>
