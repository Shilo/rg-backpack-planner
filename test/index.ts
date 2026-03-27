import { fileURLToPath } from "node:url";
import "./utils.ts";

const GLOBAL_LOG_FILE_PATH = fileURLToPath(new URL("./index.output.log", import.meta.url));

const TEST_FILES = [
    // 1. Fundamentals & Utilities
    "mathUtil.test.ts",
    "stringUtil.test.ts",
    "systemUtil.test.ts",
    "appInfo.test.ts",
    "themeEngine.test.ts",
    "skillValueFns.test.ts",

    // 2. Core State & Logic
    "treeLevelsStore.test.ts",
    "treeBranchReset.test.ts",
    "treeProgressStore.test.ts",
    "treeLayout.test.ts",
    "globalLeafCap.test.ts",
    "tierLeveling.test.ts",
    "tierTargetLevelFns.test.ts",
    "nodeActionPreview.test.ts",
    "resolveAction.test.ts",
    "resolveNodeAction.test.ts",
    "inputLabels.test.ts",
    "keyboardAction.test.ts",
    "shortcutFlash.test.ts",
    "buildDataApplier.test.ts",
    "skillBonusStore.test.ts",
    "calculateTechCrystalsSpent.test.ts",
    "budgetEnforcement.test.ts",
    "undoHistory.test.ts",
    "undoHistoryEdgeCases.test.ts",
    "undoHistorySession.test.ts",
    "resetTreeChoiceModel.test.ts",

    // 3. Serialization & Storage
    "storage.test.ts",
    "latestUsedVersionStore.test.ts",
    "runMigrations.test.ts",
    "localePersistenceBugFix.test.ts",
    "encoder.test.ts",

    // 4. Features (Presets & Sharing)
    "buildPresets.test.ts",
    "shareUrl.test.ts",

    // 5. UI & Interaction
    "globalContextMenu.test.ts",
    "composeFilename.test.ts",
    "captureServiceOrderGuard.test.ts",
    "captureServiceViewStateRestore.test.ts",
    "captureServiceCloseUpZoomFit.test.ts",
    "captureFixIOS.test.ts",
    "treeBridgeRestoreAfterCapture.test.ts",
    "modalHostKeyboardBackdropGuard.test.ts",
    "colorPickerDialogKeyboardBackdropGuard.test.ts",
    "colorPickerDialogBackdropInteraction.test.ts",
    "backdropKeyboardOpenHeuristic.test.ts",
    "treeZoomSetting.test.ts",
    "treePinchTapCancellation.test.ts",
    "treeInitialFocusConsistency.test.ts",
    "treeTextSizeBoundsReactivity.test.ts",
    "treeLocaleBoundsReactivity.test.ts",
    "treeBottomInsetRefocus.test.ts",
    "treeBadgeVisibilityBoundsReactivity.test.ts",
    "treeReactiveFocusGuard.test.ts",
    "treeFocusViewStateReactivity.test.ts",
    "nodePrimaryActionSetting.test.ts",
    "nodeLevelBehaviorSetting.test.ts",
    "showTierSetting.test.ts",
    "treeContextMenuSkillLabelWidth.test.ts",
    "treeContextMenuWidth.test.ts",
    "uppercaseTextSetting.test.ts",
    "treeTopLeftOrigin.test.ts",
    "imageViewerLayout.test.ts",
    "imageViewerClampAtFit.test.ts",
    "textHintsShared.test.ts",
    "onboardingPaneLayout.test.ts",
];

async function runAllTests() {
    console.log("Starting tests...\n");

    let passed = 0;
    let failed = 0;

    for (const file of TEST_FILES) {
        console.log(`Running ${file}...`);
        try {
            await import(`./${file}`);
            console.log(`✅ ${file} passed\n`);
            passed++;
        } catch (err) {
            console.error(`❌ ${file} failed:\n`, err, "\n");
            failed++;
        }
    }

    console.log("===");
    console.log("Global Test Summary");
    console.log("===");
    console.log(`📊 Total test files: ${TEST_FILES.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("===");

    if (failed === 0) {
        console.log("🎉 All tests completed successfully!");
    } else {
        console.log("⚠️ Some tests failed. Check the logs above.");
    }

    console.log(`Log file: ${GLOBAL_LOG_FILE_PATH}:1`);
    console.log("===");

    if (failed > 0) {
        process.exit(1);
    }
}

runAllTests().catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
});
