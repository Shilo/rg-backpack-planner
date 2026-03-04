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
        techCrystalsSpent,
        techCrystalsSpentGuardian,
        techCrystalsSpentVanguard,
        techCrystalsSpentCannon,
    } from "../techCrystalStore";
    import { t } from "svelte-whisper";

    let statsTable: CodeBlockTable | null = null;
    let statsRows: Array<[string, string]> = [];
    $: {
        statsRows = [
            [$t("statistics.backpackSkillBoosts"), ""],
            [$t("statistics.attackBoost"), "10,000%"],
            [$t("statistics.defenseBoost"), "30,000%"],
            [$t("statistics.criticalHit"), "160%"],
            [$t("statistics.globalAtk"), "200%"],
            [$t("statistics.finalDamageBoost"), "20%"],
            [$t("statistics.backpackNodeLevels"), ""],
            [$t("statistics.total"), formatNumber($treeLevelsTotal)],
            [$t("trees.guardian"), formatNumber($treeLevelsGuardian)],
            [$t("trees.vanguard"), formatNumber($treeLevelsVanguard)],
            [$t("trees.cannon"), formatNumber($treeLevelsCannon)],
            [$t("statistics.techCrystalsSpent"), ""],
            [$t("statistics.total"), formatNumber($techCrystalsSpent)],
            [$t("trees.guardian"), formatNumber($techCrystalsSpentGuardian)],
            [$t("trees.vanguard"), formatNumber($techCrystalsSpentVanguard)],
            [$t("trees.cannon"), formatNumber($techCrystalsSpentCannon)],
        ];
    }
</script>

<SideMenuSection title={$t("sideMenu.sections.statistics")}>
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
        border: var(--border-width) solid var(--border-subtle);
        border-radius: var(--radius);
        overflow: hidden;
    }

    :global(.side-menu__stats-copy) {
        justify-self: end;
        padding: 0px !important;
        min-height: 0px !important;
        border-radius: 0px !important;
        background: transparent !important;
        border: none !important;
        color: var(--text-muted) !important;
        width: 18px !important;
        height: 18px !important;

        :global(.button-icon) {
            width: 100% !important;
            height: 100% !important;
        }
    }
</style>
