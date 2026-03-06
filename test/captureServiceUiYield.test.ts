import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(sourcePath, "utf8");

if (!/async function yieldForUiFrame\(/.test(source)) {
    throw new Error(
        "captureService should define yieldForUiFrame() so long capture runs periodically yield back to the UI thread.",
    );
}

if (
    !/const blob0 = await captureTreeImageByIndex\(0, bridge, parent\);\s*await yieldForUiFrame\(\);\s*const blob1 = await captureTreeImageByIndex\(1, bridge, parent\);\s*await yieldForUiFrame\(\);\s*const blob2 = await captureTreeImageByIndex\(2, bridge, parent\);/s.test(
        source,
    )
) {
    throw new Error(
        "captureAllTreeImages should yield between each tree capture so loading animations can continue rendering.",
    );
}

