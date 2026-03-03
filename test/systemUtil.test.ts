import assert from "node:assert";
import { getOSName } from "../src/lib/systemUtil.ts";

const originalWindow = (global as any).window;
const originalNavigator = (global as any).navigator;

function setMockEnv(windowVal: any, navVal: any) {
    Object.defineProperty(global, "window", { value: windowVal, configurable: true, writable: true });
    Object.defineProperty(global, "navigator", { value: navVal, configurable: true, writable: true });
}

try {
    // In standard node environment without setup, let's wipe globals just to simulate missing ones
    setMockEnv(undefined, undefined);
    assert.strictEqual(getOSName(), "Device");

    // Polyfill for testing detection logic
    const mockWindow = {};

    // Test iOS
    setMockEnv(mockWindow, { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone)", platform: "iPhone" });
    assert.strictEqual(getOSName(), "iOS");

    // Test Android
    setMockEnv(mockWindow, { userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5)", platform: "Linux armv8l" });
    assert.strictEqual(getOSName(), "Android");

    // Test Windows
    setMockEnv(mockWindow, { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32" });
    assert.strictEqual(getOSName(), "Windows");

    // Test macOS
    setMockEnv(mockWindow, { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", platform: "MacIntel" });
    assert.strictEqual(getOSName(), "macOS");

    // Test Linux
    setMockEnv(mockWindow, { userAgent: "Mozilla/5.0 (X11; Linux x86_64)", platform: "Linux x86_64" });
    assert.strictEqual(getOSName(), "Linux");

    // Test Unknown
    setMockEnv(mockWindow, { userAgent: "UnknownDevice/1.0", platform: "UnknownPlatform" });
    assert.strictEqual(getOSName(), "Device");

} finally {
    setMockEnv(originalWindow, originalNavigator);
}
