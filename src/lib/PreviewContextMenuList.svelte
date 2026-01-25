<script lang="ts">
  import ShareBuildButton from "./buttons/ShareBuildButton.svelte";
  import Button from "./Button.svelte";
  import { XCircleIcon } from "phosphor-svelte";
  import { BASE64URL_PATTERN } from "./buildData/encoder";

  export let onButtonPress: (() => void) | null = null;

  function handleStopPreview() {
    // Remove build data from URL and reload to switch to personal mode
    // This ensures a clean state transition with proper initialization
    if (typeof window !== "undefined") {
      // Set a flag to show toast after reload
      sessionStorage.setItem("rg-backpack-planner-stopped-preview", "true");
      
      // Remove build data from pathname: /{encoded}
      const pathname = window.location.pathname;
      const pathSegments = pathname.split("/").filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        // Check if it looks like base64url encoded data
        if (BASE64URL_PATTERN.test(lastSegment) && lastSegment.length > 10) {
          pathSegments.pop();
        }
      }
      // Ensure we preserve at least the base path from vite.config.ts
      const basePath = pathSegments.length > 0 
        ? `/${pathSegments.join("/")}/` 
        : "/rg-backpack-planner/";
      
      // Update URL to remove build data
      window.history.replaceState({}, "", basePath);
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
