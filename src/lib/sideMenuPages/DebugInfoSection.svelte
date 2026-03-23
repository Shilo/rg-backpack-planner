<script lang="ts">
    import { CopySimpleIcon } from "phosphor-svelte";
    import { getCurrentVersion, getStoredVersion } from "../latestUsedVersionStore";
    import { locale, t } from "svelte-whisper";
    import { showToast } from "../toast";
    import { triggerHaptic } from "../hapticsStore";
    import { onMount } from "svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import SystemInfoPerformanceSection from "./SystemInfoPerformanceSection.svelte";
    import { formatFps, startFpsMonitor } from "./systemInfoPerformance";

    type NavigatorUAData = {
        mobile?: boolean;
        platform?: string;
        brands?: { brand: string; version: string }[];
        getHighEntropyValues?: (
            hints: string[],
        ) => Promise<{
            model?: string;
            platform?: string;
            platformVersion?: string;
            fullVersionList?: { brand: string; version: string }[];
        }>;
    };

    type InfoEntry = { label: string; value: string };

    const version = getCurrentVersion();
    const storedVersion = getStoredVersion();
    const userAgent = navigator.userAgent;
    const displayMode = window.matchMedia("(display-mode: standalone)").matches
        ? "Standalone (PWA)"
        : "Browser Tab";
    const networkType =
        (navigator as Navigator & { connection?: { effectiveType?: string } })
            .connection?.effectiveType ?? "unknown";
    const langsPref = navigator.languages?.join(", ") ?? navigator.language;
    const deviceMemory =
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
        null;
    const cpuCores = navigator.hardwareConcurrency ?? null;
    const screenInfo = `${screen.width}x${screen.height} @${devicePixelRatio}x`;
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onlineStatus = navigator.onLine;

    function getLocalStorageSize(): string {
        try {
            let bytes = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    bytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
                }
            }
            if (bytes < 1024) return `${bytes} B`;
            return `${(bytes / 1024).toFixed(1)} KB`;
        } catch {
            return "unavailable";
        }
    }

    const localStorageSize = getLocalStorageSize();

    let swStatus = "…";
    let deviceModel = "";
    let browserVersion = "";
    let platformInfo = "";
    let currentFps: number | null = null;
    let averageFps: number | null = null;
    let lowestFps: number | null = null;

    async function loadSystemDetails() {
        if ("serviceWorker" in navigator) {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (!reg) {
                    swStatus = "not registered";
                } else if (reg.installing) {
                    swStatus = "installing";
                } else if (reg.waiting) {
                    swStatus = "waiting";
                } else if (reg.active) {
                    swStatus = "active";
                } else {
                    swStatus = "registered";
                }
            } catch {
                swStatus = "error";
            }
        } else {
            swStatus = "not supported";
        }

        const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData })
            .userAgentData;
        if (uaData?.getHighEntropyValues) {
            try {
                const hints = await uaData.getHighEntropyValues([
                    "model",
                    "platform",
                    "platformVersion",
                    "fullVersionList",
                ]);
                deviceModel = hints.model || "";
                platformInfo = [hints.platform, hints.platformVersion]
                    .filter(Boolean)
                    .join(" ");
                const chrome = hints.fullVersionList?.find(
                    (b) => b.brand === "Google Chrome" || b.brand === "Chromium",
                );
                if (chrome) browserVersion = `${chrome.brand} ${chrome.version}`;
            } catch {
                // Client hints not available
            }
        }
        if (!platformInfo && uaData?.platform) {
            platformInfo = uaData.platform;
        }
    }

    onMount(() => {
        void loadSystemDetails();
        const stopFpsMonitor = startFpsMonitor((snapshot) => {
            currentFps = snapshot.currentFps;
            averageFps = snapshot.averageFps;
            lowestFps = snapshot.lowestFps;
        });
        return () => {
            stopFpsMonitor();
        };
    });

    $: performanceEntries = [
        { label: $t("systemInfo.currentFps"), value: formatFps(currentFps) },
        { label: $t("systemInfo.averageFps"), value: formatFps(averageFps) },
        { label: $t("systemInfo.lowestFps"), value: formatFps(lowestFps) },
    ] satisfies InfoEntry[];

    $: appEntries = [
        { label: $t("systemInfo.version"), value: version },
        { label: $t("systemInfo.storedVersion"), value: storedVersion ?? "none" },
        { label: $t("systemInfo.localStorage"), value: localStorageSize },
        { label: $t("systemInfo.locale"), value: $locale ?? "unknown" },
        { label: $t("systemInfo.displayMode"), value: displayMode },
        { label: $t("systemInfo.serviceWorker"), value: swStatus },
    ] satisfies InfoEntry[];

    $: deviceEntries = [
        ...(deviceModel ? [{ label: $t("systemInfo.device"), value: deviceModel }] : []),
        ...(platformInfo ? [{ label: $t("systemInfo.platform"), value: platformInfo }] : []),
        ...(browserVersion ? [{ label: $t("systemInfo.browser"), value: browserVersion }] : []),
        { label: $t("systemInfo.screen"), value: screenInfo },
        { label: $t("systemInfo.viewport"), value: viewport },
        ...(deviceMemory != null
            ? [{ label: $t("systemInfo.memory"), value: `${deviceMemory} GB` }]
            : []),
        ...(cpuCores != null
            ? [{ label: $t("systemInfo.cpuCores"), value: String(cpuCores) }]
            : []),
        { label: $t("systemInfo.touchSupport"), value: touchSupport ? "yes" : "no" },
    ] satisfies InfoEntry[];

    $: envEntries = [
        { label: $t("systemInfo.browserLang"), value: langsPref },
        { label: $t("systemInfo.online"), value: onlineStatus ? "yes" : "no" },
        { label: $t("systemInfo.network"), value: networkType },
        { label: $t("systemInfo.reducedMotion"), value: reducedMotion ? "yes" : "no" },
    ] satisfies InfoEntry[];

    function formatForClipboard(): string {
        const sections = [
            { title: $t("systemInfo.sectionPerformance"), items: performanceEntries },
            { title: $t("systemInfo.sectionApp"), items: appEntries },
            { title: $t("systemInfo.sectionDevice"), items: deviceEntries },
            { title: $t("systemInfo.sectionEnvironment"), items: envEntries },
        ];

        const allItems = sections.flatMap((s) => s.items);
        const maxLabel = Math.max(...allItems.map((e) => e.label.length));

        const parts = sections.map((s) => {
            const rows = s.items
                .map((e) => `${e.label.padEnd(maxLabel)}  ${e.value}`)
                .join("\n");
            return `${s.title}\n${rows}`;
        });

        const uaLabel = $t("systemInfo.userAgent");
        parts.push(`${uaLabel}\n${userAgent}`);

        return "```\n" + parts.join("\n\n") + "\n```";
    }

    async function copySystemInfo() {
        triggerHaptic();
        const text = formatForClipboard();
        try {
            await navigator.clipboard.writeText(text);
            showToast($t("systemInfo.copied"), { tone: "positive" });
        } catch {
            showToast($t("systemInfo.copyFailed"), { tone: "negative" });
        }
    }
</script>

<div class="system-info">
    <SystemInfoPerformanceSection entries={performanceEntries} />

    <SideMenuSection title={$t("systemInfo.sectionApp")}>
        <div class="info-card">
            {#each appEntries as entry}
                <div class="info-row">
                    <span class="info-label">{entry.label}</span>
                    <span class="info-value">{entry.value}</span>
                </div>
            {/each}
        </div>
    </SideMenuSection>

    <SideMenuSection title={$t("systemInfo.sectionDevice")}>
        <div class="info-card">
            {#each deviceEntries as entry}
                <div class="info-row">
                    <span class="info-label">{entry.label}</span>
                    <span class="info-value">{entry.value}</span>
                </div>
            {/each}
        </div>
    </SideMenuSection>

    <SideMenuSection title={$t("systemInfo.sectionEnvironment")}>
        <div class="info-card">
            {#each envEntries as entry}
                <div class="info-row">
                    <span class="info-label">{entry.label}</span>
                    <span class="info-value">{entry.value}</span>
                </div>
            {/each}
        </div>
    </SideMenuSection>

    <div class="info-card ua-card">
        <div class="ua-header">{$t("systemInfo.userAgent")}</div>
        <div class="ua-value">{userAgent}</div>
    </div>

    <button class="copy-btn" on:click={copySystemInfo}>
        <CopySimpleIcon size={16} weight="bold" />
        {$t("systemInfo.copyAll")}
    </button>
</div>

<style>
    .system-info {
        display: grid;
        gap: var(--spacing-lg);
        padding: var(--spacing-lg);
    }

    .info-card {
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md) var(--spacing-lg);
        border-top: var(--border-width) solid var(--border);
    }

    .info-row:first-child {
        border-top: none;
    }

    .info-label {
        font-size: var(--font-base);
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .info-value {
        font-size: var(--font-base);
        color: var(--text-disabled);
        text-align: right;
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .ua-card {
        padding: var(--spacing-md) var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .ua-header {
        font-size: var(--font-base);
        color: var(--text-muted);
    }


    .ua-value {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        word-break: break-all;
    }

    .copy-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
        width: 100%;
        padding: var(--spacing-lg);
        min-height: 3rem;
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-input);
        color: var(--text-muted);
        font-size: var(--font-base);
        cursor: pointer;
        transition:
            filter var(--ease),
            transform var(--ease);
    }

    @media (hover: hover) {
        .copy-btn:hover {
            filter: var(--brightness-hover);
        }
    }

    .copy-btn:active {
        transform: scale(0.97);
        filter: var(--brightness-hover);
    }
</style>
