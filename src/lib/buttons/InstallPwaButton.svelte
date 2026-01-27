<script module lang="ts">
  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };

  type InstallState = {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
    canInstall: boolean;
    isInstalled: boolean;
    isStandalone: boolean;
  };

  const listeners = new Set<(state: InstallState) => void>();
  const sharedState: InstallState = {
    deferredInstallPrompt: null,
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
  };
  let hasInitialized = false;
  let displayModeMediaQuery: MediaQueryList | null = null;

  function detectStandalone() {
    if (typeof window === "undefined") {
      return false;
    }
    const isStandaloneDisplayMode = !!window.matchMedia?.(
      "(display-mode: standalone)",
    )?.matches;
    const isIOSStandalone = !!(window.navigator as { standalone?: boolean }).standalone;
    return isStandaloneDisplayMode || isIOSStandalone;
  }

  const INSTALLED_KEY = "pwa-installed";

  function checkLocalStorageInstallStatus(): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    try {
      const installed = localStorage.getItem(INSTALLED_KEY);
      return installed === "true";
    } catch {
      return false;
    }
  }

  function setLocalStorageInstallStatus(installed: boolean) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      if (installed) {
        localStorage.setItem(INSTALLED_KEY, "true");
      } else {
        localStorage.removeItem(INSTALLED_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  async function checkInstalledStatus() {
    // First check localStorage (most reliable for Windows)
    const localStorageInstalled = checkLocalStorageInstallStatus();
    if (localStorageInstalled) {
      return true;
    }

    // Fallback to getInstalledRelatedApps API
    if (
      typeof window === "undefined" ||
      !("getInstalledRelatedApps" in navigator)
    ) {
      return false;
    }
    try {
      const installedApps = await (navigator as any).getInstalledRelatedApps();
      return installedApps && installedApps.length > 0;
    } catch {
      return false;
    }
  }

  function updateStandaloneStatus() {
    const wasStandalone = sharedState.isStandalone;
    sharedState.isStandalone = detectStandalone();
    if (wasStandalone !== sharedState.isStandalone) {
      emitState();
    }
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

    // Initialize standalone status
    sharedState.isStandalone = detectStandalone();

    // If already running in standalone mode, app is definitely installed
    if (sharedState.isStandalone) {
      sharedState.isInstalled = true;
      setLocalStorageInstallStatus(true);
    } else {
      // Check if app is already installed (but not running in PWA mode)
      // Use synchronous localStorage check first for immediate result
      const localStorageInstalled = checkLocalStorageInstallStatus();
      if (localStorageInstalled) {
        sharedState.isInstalled = true;
        emitState();
      }
      
      // Also check async API as fallback
      checkInstalledStatus().then((isInstalled) => {
        if (isInstalled) {
          sharedState.isInstalled = true;
          setLocalStorageInstallStatus(true);
          emitState();
        }
      });
    }

    // Listen for display mode changes
    if (window.matchMedia) {
      displayModeMediaQuery = window.matchMedia("(display-mode: standalone)");
      displayModeMediaQuery.addEventListener("change", updateStandaloneStatus);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      sharedState.deferredInstallPrompt = event as BeforeInstallPromptEvent;
      sharedState.canInstall = true;
      // Only set isInstalled=false if localStorage doesn't say it's installed
      // (beforeinstallprompt can fire even for installed apps in some cases)
      if (!checkLocalStorageInstallStatus()) {
        sharedState.isInstalled = false;
      }
      emitState();
    };

    const handleAppInstalled = () => {
      sharedState.isInstalled = true;
      sharedState.canInstall = false;
      sharedState.deferredInstallPrompt = null;
      setLocalStorageInstallStatus(true);
      emitState();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Emit initial state
    emitState();
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
  import { DownloadSimpleIcon, ArrowSquareOutIcon } from "phosphor-svelte";
  import packageInfo from "../../../package.json";
  import Button from "../Button.svelte";
  import { triggerHaptic } from "../haptics";
  import { getOSName } from "../systemUtil";

  const appName = packageInfo.name ?? "app";
  const osName = getOSName();

  export let className = "";
  export let title = false;

  let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  let canInstall = false;
  let isInstalled = false;
  let isStandalone = false;

  function updateLocalState(state: InstallState) {
    deferredInstallPrompt = state.deferredInstallPrompt;
    canInstall = state.canInstall;
    isInstalled = state.isInstalled;
    isStandalone = state.isStandalone;
  }

  async function handleInstallClick() {
    if (!deferredInstallPrompt) {
      return;
    }
    triggerHaptic();
    await promptInstall();
  }

  function launchPWA() {
    // Navigate to the start_url from manifest ('.' resolves to base path)
    const basePath = import.meta.env.BASE_URL || "/rg-backpack-planner/";
    const startUrl = new URL(".", window.location.origin + basePath).href;
    
    // Note: JavaScript cannot programmatically launch a PWA window from a browser context.
    // Opening in a new tab/window is the best we can do. The browser may automatically
    // open it in the PWA window if configured to do so, otherwise it opens in a new tab.
    window.open(startUrl, "_blank");
  }

  function handleLaunchClick() {
    triggerHaptic();
    launchPWA();
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
{:else if isInstalled && !isStandalone}
  <Button
    class={className}
    on:click={handleLaunchClick}
    icon={ArrowSquareOutIcon}
    aria-label={`Open ${appName} app in new window`}
    tooltipText={`Open ${appName} app in new window`}
  >
    {#if title}
      Launch app on {osName}
    {/if}
  </Button>
{/if}
