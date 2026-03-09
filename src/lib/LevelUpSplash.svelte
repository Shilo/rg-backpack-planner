<script lang="ts">
    import { onMount } from "svelte";
    import { ensureSplashKeyframes } from "./splashTextStore";

    onMount(() => {
        ensureSplashKeyframes();
    });
</script>
