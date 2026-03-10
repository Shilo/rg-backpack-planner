import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");

if (!/const CROP_PADDING_PX = \d+;/.test(source)) {
    throw new Error(
        "captureService should keep a crop padding buffer so edge badge pixels are not clipped.",
    );
}

if (!/if \(data\[i \+ 3\] > 0\)/.test(source.replace(/\s+/g, " "))) {
    throw new Error(
        "captureService should detect content bounds from alpha pixels before cropping.",
    );
}
