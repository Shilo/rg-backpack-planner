<script lang="ts">
  import packageInfo from "../../package.json";

  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  const title = packageInfo.name;
</script>

<button
  class="menu-backdrop"
  aria-hidden={!isOpen}
  aria-label="Close menu"
  class:visible={isOpen}
  on:click={() => onClose?.()}
></button>
<aside class="side-menu" class:open={isOpen} aria-hidden={!isOpen}>
  <nav class="side-menu__content" aria-label="Primary">
    <button type="button">Load build</button>
    <button type="button">Save build</button>
    <button type="button">Reset points</button>
  </nav>
  <h2 class="side-menu__title">{title}</h2>
</aside>

<style>
  .menu-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 6, 15, 0.6);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    border: none;
    padding: 10px 0 64px;
    z-index: 7;
  }

  .menu-backdrop.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .side-menu {
    position: fixed;
    top: 0;
    right: 0;
    height: 100%;
    width: 78vw;
    max-width: 85%;
    width: min(260px, 85%);
    background: rgba(10, 16, 28, 0.98);
    border-left: 1px solid rgba(79, 111, 191, 0.35);
    transform: translateX(100%);
    transition: transform 0.25s ease;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow: hidden;
    z-index: 9;
  }

  .side-menu.open {
    transform: translateX(0);
  }

  .side-menu__title {
    position: absolute;
    left: 10px;
    bottom: 10px;
    height: 32px;
    width: calc(100% - 10px - 32px - 10px);
    line-height: 32px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    font-size: 1rem;
    color: #e7efff;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .side-menu__content {
    display: grid;
    gap: 12px;
    overflow-y: auto;
    padding-left: 10px;
    padding-right: 10px;
    scrollbar-gutter: stable;
    max-height: calc(100% - 42px);
  }

  .side-menu__content::before {
    content: "";
    height: 0px;
    display: block;
  }

  .side-menu__content::after {
    content: "";
    height: 0px;
    display: block;
  }

  .side-menu__content button {
    border: 1px solid #2c3c61;
    background: rgba(17, 27, 45, 0.7);
    color: #d4e1ff;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 0.9rem;
    text-align: left;
  }
</style>
