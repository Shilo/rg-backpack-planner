<script lang="ts">
  import CodeBlockTable from "../CodeBlockTable.svelte";
  import SideMenuSection from "../SideMenuSection.svelte";
  import CopyStatsButton from "../buttons/CopyStatsButton.svelte";
  import { formatNumber } from "../mathUtil";
  import {
    treeLevelsTotal,
    treeLevelsGuardian,
    treeLevelsVanguard,
    treeLevelsCannon,
  } from "../treeLevelsStore";
  import {
    techCrystalsSpentTotal,
    techCrystalsSpentGuardian,
    techCrystalsSpentVanguard,
    techCrystalsSpentCannon,
  } from "../techCrystalStore";

  let statsTable: CodeBlockTable | null = null;
  let statsRows: Array<[string, string]> = [];
  $: statsRows = [
    ["Tech Crystals Spent", ""],
    ["Total", formatNumber($techCrystalsSpentTotal)],
    ["Guardian", formatNumber($techCrystalsSpentGuardian)],
    ["Vanguard", formatNumber($techCrystalsSpentVanguard)],
    ["Cannon", formatNumber($techCrystalsSpentCannon)],
    ["Backpack Node Levels", ""],
    ["Total", formatNumber($treeLevelsTotal)],
    ["Guardian", formatNumber($treeLevelsGuardian)],
    ["Vanguard", formatNumber($treeLevelsVanguard)],
    ["Cannon", formatNumber($treeLevelsCannon)],
    ["Backpack Skill Boosts", ""],
    ["TODO", "TODO"],
    ["Attack Boost", "10,000%"],
    ["Defense Boost", "30,000%"],
    ["Critical Hit", "160%"],
    ["Global ATK", "200%"],
    ["Final Damage Boost", "20%"],
  ];
</script>

<SideMenuSection title="STATISTICS">
  <CopyStatsButton
    slot="action"
    class="side-menu__stats-copy"
    onCopy={() => statsTable?.copy()}
  />
  <div class="side-menu__stats-card">
    <CodeBlockTable bind:this={statsTable} rows={statsRows} />
  </div>
</SideMenuSection>

<style>
  .side-menu__stats-card {
    display: grid;
    gap: 0;
    border: 1px solid rgba(74, 110, 184, 0.35);
    border-radius: 12px;
    overflow: hidden;
  }

  :global(.side-menu__stats-copy) {
    justify-self: end;
    padding: 0px !important;
    min-height: 0px !important;
    border-radius: 0px !important;
    background: transparent !important;
    border: none !important;
    color: #a7b7e6 !important;
    width: 18px !important;
    height: 18px !important;

    :global(.button-icon) {
      width: 100% !important;
      height: 100% !important;
    }
  }
</style>
