import "./utils.ts";

async function runAllTests() {
    console.log("Starting tests...");

    console.log("\nRunning appInfo.test.ts...");
    await import("./appInfo.test.ts");
    console.log("✅ appInfo.test.ts passed");

    console.log("\nRunning editableSurfaceStyles.test.ts...");
    await import("./editableSurfaceStyles.test.ts");
    console.log("✅ editableSurfaceStyles.test.ts passed");

    console.log("\nRunning shareBuild.lazy.test.ts...");
    await import("./shareBuild.lazy.test.ts");
    console.log("✅ shareBuild.lazy.test.ts passed");

    console.log("\nRunning globalContextMenu.test.ts...");
    await import("./globalContextMenu.test.ts");
    console.log("✅ globalContextMenu.test.ts passed");

    console.log("\nRunning encoder.test.ts...");
    await import("./encoder.test.ts");
    console.log("✅ encoder.test.ts passed");

    console.log("\nRunning tierLeveling.test.ts...");
    await import("./tierLeveling.test.ts");
    console.log("✅ tierLeveling.test.ts passed");

    console.log("\n🎉 All tests completed successfully!");
}

runAllTests().catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
});
