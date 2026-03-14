<script lang="ts">
    type SpinnerTone = "default" | "negative";

    export let size = "1rem";
    export let thickness = "2px";
    export let tone: SpinnerTone = "default";
</script>

<span
    class="spinner"
    class:spinner--negative={tone === "negative"}
    style={`--spinner-size: ${size}; --spinner-thickness: ${thickness};`}
    aria-hidden="true"
></span>

<style>
    .spinner {
        display: inline-block;
        width: var(--spinner-size);
        height: var(--spinner-size);
        flex-shrink: 0;
        vertical-align: middle;
        box-sizing: border-box;
        border-radius: 999px;
        border: var(--spinner-thickness) solid
            color-mix(in srgb, var(--text-muted) 22%, transparent);
        border-top-color: var(--accent);
        animation: spinner-rotate 0.75s linear infinite;
    }

    .spinner--negative {
        border-color: color-mix(in srgb, var(--danger-text) 22%, transparent);
        border-top-color: var(--danger-text);
    }

    @keyframes spinner-rotate {
        to {
            transform: rotate(360deg);
        }
    }
</style>
