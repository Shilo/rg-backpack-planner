<script module lang="ts">
  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };

  type InstallState = {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
    canInstall: boolean;
    isInstalled: boolean;
  };

  const listeners = new Set<(state: InstallState) => void>();
  const sharedState: InstallState = {
    deferredInstallPrompt: null,
    canInstall: false,
    isInstalled: false,
  };
  let hasInitialized = false;

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

  function emitState() {
    for (const notify of listeners) {
      notify(sharedState);
    }
  }

  export function ensureInstallListeners() {
    if (hasInitialized || typeof window === "undefined") {
      return;
    }
    hasInitialized = true;
    sharedState.isInstalled = detectStandalone();
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      sharedState.deferredInstallPrompt = event as BeforeInstallPromptEvent;
      sharedState.canInstall = true;
      emitState();
    };
    const handleAppInstalled = () => {
      sharedState.isInstalled = true;
      sharedState.canInstall = false;
      sharedState.deferredInstallPrompt = null;
      emitState();
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
  }

  export function subscribeInstallState(
    listener: (state: InstallState) => void,
  ) {
    listeners.add(listener);
    listener(sharedState);
    return () => {
      listeners.delete(listener);
    };
  }

  export async function promptInstall() {
    if (!sharedState.deferredInstallPrompt) {
      return false;
    }
    await sharedState.deferredInstallPrompt.prompt();
    await sharedState.deferredInstallPrompt.userChoice;
    sharedState.deferredInstallPrompt = null;
    sharedState.canInstall = false;
    emitState();
    return true;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { DownloadSimpleIcon } from "phosphor-svelte";
  import packageInfo from "../../../package.json";
  import Button from "../Button.svelte";
  import { triggerHaptic } from "../haptics";
  import { getOSName } from "../systemUtil";

  const appName = packageInfo.name ?? "app";

  export let className = "";
  export let title = false;

  let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  let canInstall = false;
  let isInstalled = false;

  function updateLocalState(state: InstallState) {
    deferredInstallPrompt = state.deferredInstallPrompt;
    canInstall = state.canInstall;
    isInstalled = state.isInstalled;
  }

  async function handleInstallClick() {
    if (!deferredInstallPrompt) {
      return;
    }
    triggerHaptic();
    await promptInstall();
  }

  onMount(() => {
    ensureInstallListeners();
    const unsubscribe = subscribeInstallState(updateLocalState);
    return () => {
      unsubscribe();
    };
  });
</script>

{#if canInstall && !isInstalled}
  {@const osName = getOSName()}
  <Button
    class={className}
    on:click={handleInstallClick}
    icon={DownloadSimpleIcon}
    aria-label={`Install ${appName} app on ${osName}`}
    tooltipText={`Install ${appName} app on ${osName}`}
  >
    {#if title}
      Install app on {osName}
    {/if}
  </Button>
{/if}
