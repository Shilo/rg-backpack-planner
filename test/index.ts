import { fileURLToPath } from "node:url";
import "./utils.ts";

const GLOBAL_LOG_FILE_PATH = fileURLToPath(new URL("./index.output.log", import.meta.url));

async function runAllTests() {
    console.log("Starting tests...\n");

    console.log("Running appInfo.test.ts...");
    await import("./appInfo.test.ts");
    console.log("✅ appInfo.test.ts passed\n");

    console.log("Running editableSurfaceStyles.test.ts...");
    await import("./editableSurfaceStyles.test.ts");
    console.log("✅ editableSurfaceStyles.test.ts passed\n");

    console.log("Running shareBuild.lazy.test.ts...");
    await import("./shareBuild.lazy.test.ts");
    console.log("✅ shareBuild.lazy.test.ts passed\n");

    console.log("Running globalContextMenu.test.ts...");
    await import("./globalContextMenu.test.ts");
    console.log("✅ globalContextMenu.test.ts passed\n");

    console.log("Running encoder.test.ts...");
    await import("./encoder.test.ts");
    console.log("✅ encoder.test.ts passed\n");

    console.log("Running tierLeveling.test.ts...");
    await import("./tierLeveling.test.ts");
    console.log("✅ tierLeveling.test.ts passed\n");

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
