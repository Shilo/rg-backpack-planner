<script lang="ts">
    import { tick } from "svelte";
    import { t } from "svelte-whisper";
    import SideMenuSection from "../SideMenuSection.svelte";

    type InfoEntry = { label: string; value: string };

    export let entries: InfoEntry[] = [];

    let previousValues: string[] = [];
    let flashingIndices = new Set<number>();
    let flashTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

    async function flashValue(index: number) {
        const existingTimeout = flashTimeouts.get(index);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        flashingIndices = new Set([...flashingIndices].filter((item) => item !== index));
        await tick();
        flashingIndices = new Set(flashingIndices).add(index);

        const timeoutId = setTimeout(() => {
            const next = new Set(flashingIndices);
            next.delete(index);
            flashingIndices = next;
            flashTimeouts.delete(index);
        }, 220);

        flashTimeouts.set(index, timeoutId);
    }

    $: {
        const nextValues = entries.map((entry) => entry.value);

        if (previousValues.length > 0) {
            nextValues.forEach((value, index) => {
                if (previousValues[index] !== value) {
                    void flashValue(index);
                }
            });
        }

        previousValues = nextValues;
    }
</script>

<SideMenuSection title={$t("systemInfo.sectionPerformance")}>
    <div class="info-card">
        {#each entries as entry, index}
            <div class="info-row">
                <span class="info-label">{entry.label}</span>
                <span class="info-value" class:value-flash={flashingIndices.has(index)}>
                    {entry.value}
                </span>
            </div>
        {/each}
    </div>
</SideMenuSection>

<style>
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

    .value-flash {
        animation: value-update-flash 220ms ease-out;
    }

    @keyframes value-update-flash {
        0% {
            color: var(--accent-light);
            filter: brightness(1.18);
        }

        100% {
            color: var(--text-disabled);
            filter: none;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .value-flash {
            animation: none;
        }
    }
</style>
