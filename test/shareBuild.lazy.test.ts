import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const shareModulePath = resolve("src/lib/buildData/share.ts");
const treeTabsPath = resolve("src/lib/TreeTabs.svelte");

const shareSource = readFileSync(shareModulePath, "utf8");
const treeTabsSource = readFileSync(treeTabsPath, "utf8");

if (
    shareSource.includes(
        'import { captureCombinedTreesImage } from "../buildImageExport/captureService";',
    )
) {
    throw new Error(
        "share.ts still eagerly imports captureCombinedTreesImage from captureService",
    );
}

if (
    !shareSource.includes(
        'await import("../buildImageExport/captureService")',
    )
) {
    throw new Error(
        "share.ts does not dynamically import the screenshot capture service",
    );
}

if (treeTabsSource.includes('./buildImageExport/captureService')) {
    throw new Error(
        "TreeTabs.svelte still imports lightweight capture helpers from the heavy capture service",
    );
}

if (treeTabsSource.includes('./buildImageExport/captureBridge')) {
    throw new Error(
        "TreeTabs.svelte should not import from the capture bridge module",
    );
}
