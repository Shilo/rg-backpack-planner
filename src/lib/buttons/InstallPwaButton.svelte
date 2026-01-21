<script lang="ts">
  import { onMount } from "svelte";
  import { Download } from "lucide-svelte";
  import Button from "../Button.svelte";
  import { triggerHaptic } from "../haptics";

  export let className = "";

  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };

  let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  let canInstall = false;
  let isInstalled = false;

  function detectStandalone() {
    if (typeof window === "undefined") {
      return false;
    }
    const isStandaloneDisplayMode = !!window.matchMedia?.(
      "(display-mode: standalone)",
    )?.matches;
    return (
      isStandaloneDisplayMode ||
      !!(window.navigator as { standalone?: boolean }).standalone
    );
  }

  async function handleInstallClick() {
    if (!deferredInstallPrompt) {
      return;
    }
    triggerHaptic();
    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    canInstall = false;
  }

  onMount(() => {
    isInstalled = detectStandalone();
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredInstallPrompt = event as BeforeInstallPromptEvent;
      canInstall = true;
    };
    const handleAppInstalled = () => {
      isInstalled = true;
      canInstall = false;
      deferredInstallPrompt = null;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  });
</script>

{#if canInstall && !isInstalled}
  <Button
    class={className}
    on:click={handleInstallClick}
    icon={Download}
    aria-label="Install app"
    tooltipText="Install app"
  />
{/if}
