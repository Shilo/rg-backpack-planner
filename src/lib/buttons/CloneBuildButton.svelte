<script lang="ts" context="module">
    export type { Component };
</script>

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

    export let name: string | undefined = undefined;
    export let buildCode: string | undefined = undefined;
    export let label: string | undefined = undefined;
    export let tooltip: string | undefined = undefined;
    export let description: string | undefined = undefined;

    function handleCloneBuild() {
        const sourceName = name ?? get(previewBuildName) ?? "";
        const uniqueName = getUniquePresetName(sourceName, "Clone");
        const uniqueDisplayName = getDisplayPresetName(uniqueName);

        openModal({
            type: "confirm",
            title: $t("preview.cloneModalTitle"),
            titleIcon: CopySimpleIcon as unknown as Component,
            message: name
                ? $t("buildPresets.cloneModalMessage", {
                      name: truncateText(uniqueDisplayName),
                      originalName: truncateText(getDisplayPresetName(name)),
                  })
                : $t("preview.cloneModalMessage", {
                      name: truncateText(uniqueDisplayName),
                  }),
            confirmLabel: $t("common.clone"),
            cancelLabel: $t("common.cancel"),
            confirmPositive: true,
            onConfirm: () => {
                const finalCode =
                    buildCode ??
                    encodeBuildData({
                        trees: get(treeLevels),
                        owned: get(techCrystalsOwned),
                    });

                const preset = addPreset(uniqueName, finalCode);
                setActivePresetId(preset.id);

                if (typeof window !== "undefined") {
                    queueClonedBuildToast(uniqueName);
                    clearShareFromUrl(false);
                    window.location.reload();
                }
            },
        });
    }
</script>

<Button
    on:click={handleCloneBuild}
    tooltipText={description ? undefined : (tooltip ?? $t("preview.clonePreviewBuildTooltip"))}
    {description}
    icon={CopySimpleIcon}
    arrow="right"
    data-testid="clone-build-btn"
>
    {label ?? $t("preview.clonePreviewBuild")}
</Button>
