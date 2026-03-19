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
    "buildDataApplier.test.ts",
    "skillBonusStore.test.ts",
    "calculateTechCrystalsSpent.test.ts",
    "budgetEnforcement.test.ts",
    "ignoreTechCrystalBudgetStore.test.ts",
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
    "shareBuild.lazy.test.ts",

    // 5. UI & Interaction
    "editableSurfaceStyles.test.ts",
    "controlFocusPolicy.test.ts",
    "globalContextMenu.test.ts",
    "nodeBadge.test.ts",
    "nodeBadgeTypographyConsistency.test.ts",
    "nodeContentMenuTierAction.test.ts",
    "nodeFocusStyle.test.ts",
    "rootNodeGearStructure.test.ts",
    "rootNodeQuickSettingsBackdropTouchGuard.test.ts",
    "rootNodeQuickSettingsRouting.test.ts",
    "rootNodeQuickSettingsToastLabels.test.ts",
    "rootNodeInputHandling.test.ts",
    "longPressContextMenuSuppression.test.ts",
    "treeContextMenuInputHandling.test.ts",
    "appHotkeys.test.ts",
    "shareBuildButtonComposeOpen.test.ts",
    "previewBuildsDropdownTcDescription.test.ts",
    "composeFilename.test.ts",
    "composeScreenshotHost.test.ts",
    "composeScreenshotStaticLoadingIndicator.test.ts",
    "composeScreenshotTechCrystalCards.test.ts",
    "mobileTextSizeAdjust.test.ts",
    "tabLabelAutoFitStyles.test.ts",
    "bottomNavTabBarLayoutGuard.test.ts",
    "composeAllTabIconVisible.test.ts",
    "composeScreenshotTabsAndFilename.test.ts",
    "imageFormatExports.test.ts",
    "captureServiceMetadataCards.test.ts",
    "captureServiceMetadataCardRestyle.test.ts",
    "captureServiceMetadataCardLayout.test.ts",
    "captureServiceBadgeBounds.test.ts",
    "captureServiceCenteredBounds.test.ts",
    "captureServiceBadgeTypographyStyles.test.ts",
    "captureServiceRenderStability.test.ts",
    "captureServiceOrderGuard.test.ts",
    "captureServiceViewStateRestore.test.ts",
    "captureServiceBridgeInterface.test.ts",
    "captureServiceStyleParity.test.ts",
    "captureServiceTransformFallbacks.test.ts",
    "captureServiceCloseUpZoomFit.test.ts",
    "captureFixIOS.test.ts",
    "treeBridgeRestoreAfterCapture.test.ts",
    "sideMenuComposeScreenshotClose.test.ts",
    "modalHostKeyboardBackdropGuard.test.ts",
    "activeTreeResetSheet.test.ts",
    "colorPickerDialogKeyboardBackdropGuard.test.ts",
    "colorPickerDialogBackdropInteraction.test.ts",
    "backdropKeyboardOpenHeuristic.test.ts",
    "treeZoomSetting.test.ts",
    "treePinchTapCancellation.test.ts",
    "treeFocusBoundsStability.test.ts",
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
    "uppercaseTextSetting.test.ts",
    "settingsPaging.test.ts",
    "localeCasingStyleGuide.test.ts",
    "treeLinkParentLevelColor.test.ts",
    "treeTopLeftOrigin.test.ts",
    "fullscreenModalBackground.test.ts",
    "imageViewerLayout.test.ts",
    "imageViewerClampAtFit.test.ts",
    "imageViewerResizeReset.test.ts",
    "imageViewerInteractions.test.ts",
    "imageDetailsPopover.test.ts",
    "serviceWorkerAutoUpdateModule.test.ts",
    "serviceWorkerUpdateToast.test.ts",
    "toastSpinnerApi.test.ts",
    "onboardingPaneLayout.test.ts",
    "onboardingStore.test.ts",
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
