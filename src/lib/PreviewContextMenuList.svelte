<script lang="ts">
  import ShareBuildButton from "./buttons/ShareBuildButton.svelte";
  import Button from "./Button.svelte";
  import { EyeSlashIcon } from "phosphor-svelte";
  import { clearShareFromUrl } from "./buildData/url";
  import TechCrystalsButton from "./buttons/TechCrystalsButton.svelte";
  import CloneBuildButton from "./buttons/CloneBuildButton.svelte";
  import { queueStoppedPreviewToast } from "./toast";

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

<TechCrystalsButton tooltipSubject="preview" />
<ShareBuildButton title="Share preview build" tooltipSubject="preview" />
<CloneBuildButton />
<Button
  on:click={handleStopPreview}
  tooltipText={"Exit preview mode and switch to personal build"}
  icon={EyeSlashIcon}
  negative
>
  Stop Preview
</Button>
