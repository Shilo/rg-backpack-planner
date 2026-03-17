<script lang="ts">
    import { CopySimpleIcon } from "phosphor-svelte";
    import Accordion from "../Accordion.svelte";
    import { getCurrentVersion, getStoredVersion } from "../latestUsedVersionStore";
    import { techCrystalsSpent } from "../techCrystalStore";
    import { treeLevels, sumLevels } from "../treeLevelsStore";
    import { locale } from "svelte-whisper";
    import { showToast } from "../toast";
    import { triggerHaptic } from "../hapticsStore";
    import { onMount } from "svelte";

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

    let swStatus = "checking...";
    let deviceModel = "";
    let browserVersion = "";
    let platformInfo = "";
    let reactivityProbe = 0;
    /** Plain JS counter — incremented outside Svelte's reactivity system. */
    let domTapCount = 0;
    let probeBtnEl: HTMLButtonElement | null = null;

    onMount(async () => {
        // Service worker status
        if ("serviceWorker" in navigator) {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (!reg) {
                    swStatus = "not registered";
                } else if (reg.installing) {
                    swStatus = "installing";
                } else if (reg.waiting) {
                    swStatus = "waiting (update ready)";
                } else if (reg.active) {
                    swStatus = "active";
                } else {
                    swStatus = "registered (unknown state)";
                }
            } catch {
                swStatus = "error";
            }
        } else {
            swStatus = "not supported";
        }

        // Device info via UA Client Hints (Chromium only)
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
    });

    $: totalLevels = $treeLevels.reduce((sum, t) => sum + sumLevels(t), 0);

    type DebugEntry = { label: string; value: string };

    $: entries = [
        { label: "App Version", value: version },
        { label: "Stored Version", value: storedVersion ?? "none" },
        ...(deviceModel ? [{ label: "Device", value: deviceModel }] : []),
        ...(platformInfo ? [{ label: "Platform", value: platformInfo }] : []),
        ...(browserVersion ? [{ label: "Browser", value: browserVersion }] : []),
        { label: "Screen", value: screenInfo },
        { label: "Viewport", value: viewport },
        ...(deviceMemory != null
            ? [{ label: "Memory", value: `${deviceMemory} GB` }]
            : []),
        ...(cpuCores != null
            ? [{ label: "CPU Cores", value: String(cpuCores) }]
            : []),
        { label: "Locale", value: $locale ?? "unknown" },
        { label: "Browser Lang", value: langsPref },
        { label: "Display Mode", value: displayMode },
        { label: "Service Worker", value: swStatus },
        { label: "Network", value: networkType },
        { label: "Levels Total", value: String(totalLevels) },
        { label: "Crystals Spent", value: String($techCrystalsSpent) },
        { label: "User Agent", value: userAgent },
        { label: "Taps (DOM)", value: String(domTapCount) },
        { label: "Taps (Svelte)", value: String(reactivityProbe) },
    ] satisfies DebugEntry[];

    function formatForClipboard(items: DebugEntry[]): string {
        const maxLabel = Math.max(...items.map((e) => e.label.length));
        return items
            .map((e) => `${e.label.padEnd(maxLabel)}  ${e.value}`)
            .join("\n");
    }

    async function copyDebugInfo() {
        triggerHaptic();
        const text = formatForClipboard(entries);
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied debug info", { tone: "positive" });
        } catch {
            showToast("Unable to copy", { tone: "negative" });
        }
    }
</script>

<Accordion title="Debug">
    <div class="debug-card">
        {#each entries as entry}
            <div
                class="debug-row"
                class:debug-row-wrap={entry.label === "User Agent"}
            >
                <span class="debug-label">{entry.label}</span>
                <span
                    class="debug-value"
                    class:debug-value-mono={entry.label === "User Agent"}
                    >{entry.value}</span
                >
            </div>
        {/each}

        <div class="debug-actions">
            <button
                class="debug-probe-btn"
                bind:this={probeBtnEl}
                on:click={() => {
                    domTapCount++;
                    reactivityProbe++;
                    triggerHaptic();
                    if (probeBtnEl) {
                        probeBtnEl.dataset.domCount = String(domTapCount);
                    }
                }}
            >
                Tap to test: <span class="probe-svelte">{reactivityProbe}</span>
                / <span class="probe-dom" data-dom-count={domTapCount}
                    >{domTapCount}</span
                >
            </button>

            <button class="debug-copy-btn" on:click={copyDebugInfo}>
                <CopySimpleIcon size={14} weight="bold" />
                Copy
            </button>
        </div>
    </div>
</Accordion>

<style>
    .debug-card {
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .debug-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) var(--spacing-lg);
        border-top: var(--border-width) solid var(--border);
    }

    .debug-row:first-child {
        border-top: none;
    }

    .debug-row-wrap {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-xs);
    }

    .debug-label {
        font-size: var(--font-sm);
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .debug-value {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        text-align: right;
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .debug-value-mono {
        text-align: left;
        font-size: var(--font-xs);
        line-height: var(--leading);
        word-break: break-all;
    }

    .debug-actions {
        display: grid;
        grid-template-columns: 1fr 6rem;
        border-top: var(--border-width) solid var(--border);
    }

    .debug-probe-btn,
    .debug-copy-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-lg) var(--spacing-lg);
        min-height: 3rem;
        border: none;
        background: var(--bg-input);
        color: var(--text-muted);
        font-size: var(--font-sm);
        cursor: pointer;
        transition:
            filter var(--ease),
            transform var(--ease);
    }

    .debug-copy-btn {
        border-left: var(--border-width) solid var(--border);
        gap: var(--spacing-sm);
        padding-left: var(--spacing-xl);
        padding-right: var(--spacing-xl);
    }

    @media (hover: hover) {
        .debug-probe-btn:hover,
        .debug-copy-btn:hover {
            filter: var(--brightness-hover);
        }
    }

    .debug-probe-btn:active,
    .debug-copy-btn:active {
        transform: scale(0.96);
        filter: var(--brightness-hover);
    }
</style>
