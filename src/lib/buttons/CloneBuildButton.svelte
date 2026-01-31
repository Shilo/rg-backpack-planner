<script lang="ts">
  import type { ComponentType } from "svelte";
  import { CopySimpleIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import { get } from "svelte/store";
  import { treeLevels } from "../treeLevelsStore";
  import { techCrystalsOwned } from "../techCrystalStore";
  import { updateActivePresetEncoded } from "../buildPresetsStore";
  import { encodeBuildData } from "../buildData/encoder";
  import { showToast, queueClonedBuildToast } from "../toast";
  import { clearShareFromUrl } from "../buildData/url";
  import { openModal } from "../modalStore";

  function handleCloneBuild() {
    openModal({
      type: "confirm",
      title: "CLONE PREVIEW BUILD",
      titleIcon: CopySimpleIcon as unknown as ComponentType,
      message: "override your current personal build with the preview build.",
      confirmLabel: "Clone",
      cancelLabel: "Cancel",
      confirmPositive: true,
      onConfirm: () => {
        try {
          const currentTreeLevels = get(treeLevels);
          const currentTechCrystalsOwned = get(techCrystalsOwned);
          const encoded = encodeBuildData({
            trees: currentTreeLevels,
            owned: currentTechCrystalsOwned,
          });
          updateActivePresetEncoded(encoded);

          if (typeof window !== "undefined") {
            queueClonedBuildToast();
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
