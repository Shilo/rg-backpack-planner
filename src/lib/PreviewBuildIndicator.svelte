<script lang="ts">
  import { isPreviewMode } from "./previewModeStore";
</script>

{#if $isPreviewMode}
  <div class="preview-indicator">
    Preview build
  </div>
{/if}

<style>
  .preview-indicator {
    background: rgba(79, 111, 191, 0.2);
    border: 1px solid rgba(79, 111, 191, 0.5);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #c7d6ff;
    white-space: nowrap;
  }
</style>
