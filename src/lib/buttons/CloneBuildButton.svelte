<script lang="ts">
  import type { ComponentType } from "svelte";
  import { CopySimpleIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import { get } from "svelte/store";
  import { treeLevels } from "../treeLevelsStore";
  import {
    techCrystalsOwned,
    saveTechCrystalsOwnedToStorage,
  } from "../techCrystalStore";
  import { saveTreeProgress } from "../treeProgressStore";
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
          // Get current build data from stores
          const currentTreeLevels = get(treeLevels);
          const currentTechCrystalsOwned = get(techCrystalsOwned);

          // Save tree levels to persistent storage
          saveTreeProgress(currentTreeLevels);

          // Save tech crystals owned to persistent storage
          saveTechCrystalsOwnedToStorage(currentTechCrystalsOwned);

          // Stop preview mode
          if (typeof window !== "undefined") {
            // Queue toast to show after reload
            queueClonedBuildToast();

            // Clear share data from URL, leaving only base path
            // Use pushState to preserve share link in history for back button
            clearShareFromUrl(false);

            // Reload to re-initialize in personal mode
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
