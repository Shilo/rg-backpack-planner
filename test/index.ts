import { fileURLToPath } from "node:url";
import "./utils.ts";

const GLOBAL_LOG_FILE_PATH = fileURLToPath(new URL("./index.output.log", import.meta.url));

async function runAllTests() {
    console.log("Starting tests...\n");

    console.log("Running appInfo.test.ts...");
    await import("./appInfo.test.ts");
    console.log("✅ appInfo.test.ts passed\n");

    console.log("Running buildDataApplier.test.ts...");
    await import("./buildDataApplier.test.ts");
    console.log("✅ buildDataApplier.test.ts passed\n");

    console.log("Running editableSurfaceStyles.test.ts...");
    await import("./editableSurfaceStyles.test.ts");
    console.log("✅ editableSurfaceStyles.test.ts passed\n");

    console.log("Running shareUrl.test.ts...");
    await import("./shareUrl.test.ts");
    console.log("✅ shareUrl.test.ts passed\n");

    console.log("Running buildPresets.test.ts...");
    await import("./buildPresets.test.ts");
    console.log("✅ buildPresets.test.ts passed\n");

    console.log("Running shareBuild.lazy.test.ts...");
    await import("./shareBuild.lazy.test.ts");
    console.log("✅ shareBuild.lazy.test.ts passed\n");

    console.log("Running globalContextMenu.test.ts...");
    await import("./globalContextMenu.test.ts");
    console.log("✅ globalContextMenu.test.ts passed\n");

    console.log("Running encoder.test.ts...");
    await import("./encoder.test.ts");
    console.log("✅ encoder.test.ts passed\n");

    console.log("Running storage.test.ts...");
    await import("./storage.test.ts");
    console.log("✅ storage.test.ts passed\n");

    console.log("Running tierLeveling.test.ts...");
    await import("./tierLeveling.test.ts");
    console.log("✅ tierLeveling.test.ts passed\n");

    console.log("Running mathUtil.test.ts...");
    await import("./mathUtil.test.ts");
    console.log("✅ mathUtil.test.ts passed\n");

    console.log("Running stringUtil.test.ts...");
    await import("./stringUtil.test.ts");
    console.log("✅ stringUtil.test.ts passed\n");

    console.log("Running systemUtil.test.ts...");
    await import("./systemUtil.test.ts");
    console.log("✅ systemUtil.test.ts passed\n");

    console.log("Running skillValueFns.test.ts...");
    await import("./skillValueFns.test.ts");
    console.log("✅ skillValueFns.test.ts passed\n");

    console.log("Running treeLevelsStore.test.ts...");
    await import("./treeLevelsStore.test.ts");
    console.log("✅ treeLevelsStore.test.ts passed\n");

    console.log("Running treeProgressStore.test.ts...");
    await import("./treeProgressStore.test.ts");
    console.log("✅ treeProgressStore.test.ts passed\n");

    console.log("===");
    console.log("Global Test Summary");
    console.log("===");
    console.log("🎉 All tests completed successfully!");
    console.log(`Log file: ${GLOBAL_LOG_FILE_PATH}:1`);
    console.log("===");
}

runAllTests().catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
});
