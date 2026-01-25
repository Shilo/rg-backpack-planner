<script lang="ts">
  export let title = "";
</script>

<section class="side-menu-section">
  <div class="side-menu-section__header">
    <h3 class="side-menu-section__title">{title}</h3>
    <div class="side-menu-section__action">
      <slot name="action" />
    </div>
  </div>
  <div class="side-menu-section__content">
    <slot />
  </div>
</section>

<style>
  .side-menu-section {
    display: grid;
    gap: 6px;
  }

  .side-menu-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .side-menu-section__title {
    margin: 0;
    font-size: 0.85rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(201, 214, 245, 0.75);
  }

  .side-menu-section__action {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .side-menu-section__action:empty {
    display: none;
  }

  .side-menu-section__content {
    display: grid;
    gap: 6px;
  }
</style>
