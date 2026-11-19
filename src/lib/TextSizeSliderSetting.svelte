<script lang="ts">
    import type { Component } from "svelte";
    import { t, formatNumber } from "svelte-whisper";
    import { TextTIcon } from "phosphor-svelte";
    import SliderSetting from "./SliderSetting.svelte";
    import {
        textSize,
        isTextSizeNotchIndex,
        TEXT_SIZE_NOTCH_MIN,
        TEXT_SIZE_NOTCH_MAX,
        DEFAULT_TEXT_SIZE_NOTCH,
        getTextSizeScale,
    } from "./textSizeStore";

    // Reactive, so SliderSetting receives a new formatter when the locale changes.
    $: formatTextSizeLabel = (notchIndex: number): string =>
        $formatNumber(getTextSizeScale(notchIndex)) + "x";

    function handleTextSizeChange(notchIndex: number) {
        if (!isTextSizeNotchIndex(notchIndex)) return;
        textSize.set(notchIndex);
    }
</script>

<SliderSetting
    label={$t("settings.textSize")}
    ariaLabel={$t("settings.textSize")}
    icon={TextTIcon as unknown as Component}
    min={TEXT_SIZE_NOTCH_MIN}
    max={TEXT_SIZE_NOTCH_MAX}
    step={1}
    value={$textSize}
    defaultNotchIndex={DEFAULT_TEXT_SIZE_NOTCH}
    formatValue={formatTextSizeLabel}
    onChange={handleTextSizeChange}
    description={$t("settings.textSizeDescription")}
/>
