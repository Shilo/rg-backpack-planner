<script lang="ts">
  export let title = "";
</script>

<section class="side-menu-section">
  <h3 class="side-menu-section__title">{title}</h3>
  <div class="side-menu-section__content">
    <slot />
  </div>
</section>

<style>
  .side-menu-section {
    display: grid;
    gap: 10px;
  }

  .side-menu-section__title {
    margin: 0;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(201, 214, 245, 0.75);
    padding-left: 4px;
  }

  .side-menu-section__content {
    display: grid;
    gap: 10px;
  }
</style>
