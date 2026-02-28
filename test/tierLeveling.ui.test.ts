import { chromium } from "playwright";
import { tierSweepCases } from "./tierLeveling.shared.ts";

let browser = null;

try {
    console.log(`Tier UI stub: ${tierSweepCases.length} cases loaded`);
    browser = await chromium.launch({ headless: false });
} finally {
    await browser?.close();
}
