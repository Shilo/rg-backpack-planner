<script lang="ts">
  import { Hexagon } from "lucide-svelte";

  export let className = "";
</script>

<span class={`currency-icon ${className}`.trim()} aria-hidden="true">
  <Hexagon size={20} fill="currentColor" stroke="none" />
</span>

<style>
  .currency-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    margin-left: 2px;
    color: #4fa3d9;
  }
</style>
