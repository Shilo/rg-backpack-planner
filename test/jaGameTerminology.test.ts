import assert from "node:assert";
import { readFileSync } from "node:fs";

type LocaleTree = Record<string, unknown>;

function parseLocale(path: string): LocaleTree {
    return JSON.parse(readFileSync(path, "utf8"));
}

function get(locale: LocaleTree, path: string): string {
    const value = path.split(".").reduce<unknown>((current, key) => {
        if (Array.isArray(current)) {
            return current[Number(key)];
        }
        if (current && typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, locale);

    if (typeof value !== "string") {
        throw new Error(`Expected string at locale path "${path}"`);
    }

    return value;
}

const ja = parseLocale("src/locales/ja.json");

// Verified against the backpack-specific in-game dump pair the user provided:
// - en-US.txt backpack keys such as Backdecorate_skill_name_*, career_ui_26-28,
//   item_name_key1004022, rule_content_28, and fx_app_name
// - ja-JP.txt matching keys for canonical Japanese terminology
const EXPECTED_TERMS: Record<string, string> = {
    "app.gameName": "走れ！女神",
    "app.description": "バッグ研究のビルドを計画・共有しましょう。",
    "sideMenu.tabs.statistics.tooltip": "スキル、レベル、研究クリスタルデータを表示",

    "trees.guardian": "近衛兵",
    "trees.vanguard": "先駆者",
    "trees.cannon": "火砲",
    "trees.rules.0": "研究クリスタルを消費してバッグ研究を有効化またはアップグレードします。",
    "trees.rules.2": "ブランチを選択した後、同じページの別のブランチを選択する前に、そのブランチの最終スキルを解放する必要があります。",
    "trees.rules.3": "各転職には3つのブランチがあり、合計9つの最終スキルがあります。プレイヤーが習得できるのは3つまでです。",
    "trees.rules.4": "リセットすると現在のページで消費された研究クリスタルが全額返還されます。リセット回数は無制限です。",

    "skills.attack_boost": "攻撃力強化",
    "skills.hp_boost": "HP強化",
    "skills.defense_boost": "防御力強化",
    "skills.global_def": "グローバル防御力",
    "skills.global_hp": "グローバルHP",
    "skills.final_damage_boost": "最終ダメージ",
    "skills.global_atk": "グローバル攻撃力",
    "skills.counterattack_resistance": "反撃耐性",
    "skills.critical_hit": "通常攻撃クリティカル",
    "skills.damage_reflection_chance": "ダメージ反射率",

    "skills.short.attack_boost": "攻撃強化",
    "skills.short.hp_boost": "HP強化",
    "skills.short.defense_boost": "防御強化",
    "skills.short.global_def": "グロ防御",
    "skills.short.global_hp": "グロHP",
    "skills.short.final_damage_boost": "最終ダメ",
    "skills.short.global_atk": "グロ攻撃",
    "skills.short.skill_crit": "スキクリ",
    "skills.short.counterattack_resistance": "反撃耐性",
    "skills.short.critical_hit": "通常クリ",
    "skills.short.skill_crit_resistance": "スキクリ耐性",
    "skills.short.damage_reflection_chance": "ダメ反射",

    "skillsDesc.global_def": "**グローバル防御力**が乗算修正値によって増加します。",
    "skillsDesc.global_hp": "**グローバルHP**が乗算修正値によって増加します。",
    "skillsDesc.final_damage_boost": "**最終ダメージ**が最終乗算修正値によって増加します。",
    "skillsDesc.global_atk": "**グローバル攻撃力**が乗算修正値によって増加します。",
    "skillsDesc.skill_crit": "スキルが**スキルクリティカル**を発生させ、通常より高いダメージを与える確率があります。",
    "skillsDesc.critical_hit": "通常攻撃が**通常攻撃クリティカル**を発生させ、通常より高いダメージを与える確率があります。",
    "skillsDesc.skill_crit_resistance": "**スキルクリティカル**を受ける確率を減少させます。",
    "skillsDesc.damage_reflection_chance": "攻撃を受けた際、**ダメージ反射率**と攻撃力に基づいて攻撃者に追加ダメージを与えます。",

    "settings.ignoreTechCrystalBudget": "研究クリスタル予算を無視",
    "settings.resetTreeDescription": "研究クリスタルを返還しレベル0に戻す",
    "settings.resetAllTreesDescription": "全ツリーの研究クリスタルをすべて返還",

    "techCrystals.displayTooltipSpentOnly": "研究クリスタル\n消費済み",
    "techCrystals.displayTooltipSpentOwned": "研究クリスタル\n消費 / 所持",
    "techCrystals.spentLabel": "研究クリスタル消費 / 所持",
    "techCrystals.changeOwnedTooltip": "{subject}研究クリスタルの所持数（予算）を変更",
    "techCrystals.ownedModalTitle": "研究クリスタル所持数",
    "techCrystals.ownedModalTitleWithSubject": "研究クリスタル所持数（{subject}）",
    "techCrystals.budgetReachedToast": "研究クリスタル予算に到達",

    "share.defaultShareTitle": "バッグ研究ツリービルド",
    "preview.techCrystalsDescription": "{count} 研究クリスタル",
    "modal.resetTree.messageAll": "全ノードをレベル0に戻し、全研究クリスタルを返還します。",
    "statistics.techCrystalsSpent": "研究クリスタル消費",

    "controls.actions.primaryAction": "プライマリアクション表示",
    "controls.actions.primaryActionDesc": "ノードアクションモードを切り替える[[+1、+10、+ティア]]",
    "controls.actions.budget": "研究クリスタル予算",
    "controls.actions.budgetDesc": "消費予算を変更",
    "controls.actions.sideMenu": "サイドメニュー",
    "controls.actions.sideMenuDesc": "パネルを開閉する",
    "controls.actions.resetTree": "アクティブツリーをリセット",
    "controls.actions.resetTreeDesc": "ブランチまたはツリーの研究クリスタルを返還",
    "controls.actions.undo": "元に戻す",
    "controls.actions.undoDesc": "直前の変更を元に戻す",
    "controls.actions.redo": "やり直す",
    "controls.actions.redoDesc": "最後に元に戻した変更をやり直す",
    "controls.actions.rootQuickSettings": "ルートノードクイック設定",
    "controls.actions.rootQuickSettingsDesc": "便利でよく使う設定を表示",
    "controls.actions.screenshot": "スクリーンショットを共有",
    "controls.actions.screenshotDesc": "書き出し用の画像を生成",
    "controls.actions.fullscreen": "フルスクリーン",
    "controls.actions.fullscreenDesc": "アプリを画面いっぱいに表示",
    "controls.actions.cycleTabs": "タブ切り替え",
    "controls.actions.cycleTabsDesc": "ツリーやページを切り替える",
    "controls.actions.previewIndicator": "プレビュービルド表示",
    "controls.actions.previewIndicatorDesc": "共有ビルドを確認・変更",
    "controls.actions.closeMenu": "サイドメニューまたはページを閉じる",
    "controls.actions.closeMenuDesc": "前のページに戻るか、パネルを閉じる",
    "controls.actions.levelUp": "レベルアップ",
    "controls.actions.levelUpDesc": "ノードアクション設定でレベルを追加[[+1、+10、+ティア]]",
    "controls.actions.levelUpAlt": "クイックレベルアップ",
    "controls.actions.levelUpAltDesc": "代替の増分でレベルを追加[[+ティア、+1]]",
    "controls.actions.levelDown": "レベルダウン",
    "controls.actions.levelDownDesc": "ノードアクション設定でレベルを減らす[[-1、-10、-ティア]]",
    "controls.actions.levelDownAlt": "クイックレベルダウン",
    "controls.actions.levelDownAltDesc": "代替の増分でレベルを減らす[[-ティア、-1]]",
    "controls.actions.nodeOptions": "ノードオプション",
    "controls.actions.nodeTreeOptionsDesc": "統計と選択肢を表示",
    "controls.actions.pan": "移動",
    "controls.actions.panDesc": "表示領域を移動",
    "controls.actions.zoom": "ズーム",
    "controls.actions.zoomDesc": "表示倍率を調整",
    "controls.actions.treeOptions": "ツリーオプション",
    "controls.actions.tooltip": "ツールチップ",
    "controls.actions.tooltipDesc": "状況に応じた詳細を表示",
    "controls.tutorial": "チュートリアル",

    "onboarding.hudSection": "研究クリスタル消費 / 予算",
    "onboarding.techCrystalBudget": "研究クリスタル予算を設定",
    "onboarding.budgetIgnoreDesc": "サイドメニューで予算を無効化 [[設定 > ノード > 研究クリスタル予算を無視]]",
};

for (const [path, expected] of Object.entries(EXPECTED_TERMS)) {
    assert.strictEqual(
        get(ja, path),
        expected,
        `Expected canonical Japanese game terminology at ${path}`,
    );
}
