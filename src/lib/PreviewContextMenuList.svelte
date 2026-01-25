<script lang="ts">
  import ShareBuildButton from "./buttons/ShareBuildButton.svelte";
  import Button from "./Button.svelte";
  import { XCircleIcon } from "phosphor-svelte";
  import { clearShareFromUrl } from "./buildData/url";

  export let onButtonPress: (() => void) | null = null;

  function handleStopPreview() {
    // Remove build data from URL and reload to switch to personal mode
    // This ensures a clean state transition with proper initialization
    if (typeof window !== "undefined") {
      // Set a flag to show toast after reload
      sessionStorage.setItem("rg-backpack-planner-stopped-preview", "true");
      
      // Clear share data from URL, leaving only base path
      clearShareFromUrl();
      
      // Reload to re-initialize in personal mode
      window.location.reload();
    }
  }
</script>

<ShareBuildButton title="Share preview build" tooltipSubject="preview" />
<Button
  on:click={() => {
    handleStopPreview();
    onButtonPress?.();
  }}
  tooltipText={"Exit preview mode and switch to personal build"}
  icon={XCircleIcon}
  negative
>
  Stop Preview
</Button>
