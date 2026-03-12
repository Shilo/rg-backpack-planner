import assert from "node:assert";
import {
    captureWithIOSBackground,
    isIOSCaptureBug,
} from "../src/lib/buildImageExport/captureFixIOS.ts";

type GlobalWithBrowser = typeof globalThis & {
    window?: unknown;
    navigator?: unknown;
    document?: unknown;
    getComputedStyle?: unknown;
};

type StoredStyleProperty = {
    value: string;
    priority: string;
};

function setGlobalValue(
    globalWithBrowser: GlobalWithBrowser,
    key: "window" | "navigator" | "document" | "getComputedStyle",
    value: unknown,
) {
    Object.defineProperty(globalWithBrowser, key, {
        value,
        configurable: true,
        writable: true,
    });
}

function createMockStyle(initialBackground = "", initialPriority = "") {
    const store = new Map<string, StoredStyleProperty>();
    if (initialBackground) {
        store.set("background-color", {
            value: initialBackground,
            priority: initialPriority,
        });
    }

    const style = {
        setProperty(name: string, value: string, priority = "") {
            store.set(name, { value, priority });
        },
        getPropertyValue(name: string) {
            return store.get(name)?.value ?? "";
        },
        getPropertyPriority(name: string) {
            return store.get(name)?.priority ?? "";
        },
        removeProperty(name: string) {
            const previousValue = store.get(name)?.value ?? "";
            store.delete(name);
            return previousValue;
        },
    } as unknown as CSSStyleDeclaration;

    return { style, store };
}

const globalWithBrowser = globalThis as GlobalWithBrowser;
const originalWindow = globalWithBrowser.window;
const originalNavigator = globalWithBrowser.navigator;
const originalDocument = globalWithBrowser.document;
const originalGetComputedStyle = globalWithBrowser.getComputedStyle;

try {
    setGlobalValue(globalWithBrowser, "window", {});
    setGlobalValue(globalWithBrowser, "navigator", {
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        platform: "MacIntel",
        maxTouchPoints: 5,
    });
    assert.strictEqual(
        isIOSCaptureBug(),
        true,
        "isIOSCaptureBug should treat iPad desktop-style Safari user agents as iOS.",
    );

    setGlobalValue(globalWithBrowser, "navigator", {
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        platform: "MacIntel",
        maxTouchPoints: 0,
    });
    assert.strictEqual(
        isIOSCaptureBug(),
        false,
        "isIOSCaptureBug should not classify normal macOS Safari as iOS.",
    );

    const { style } = createMockStyle("rgba(1, 2, 3, 0.4)", "important");
    const root = { style } as unknown as HTMLElement;

    const attachedNodes: unknown[] = [];
    const mockDocument = {
        createElement: () => ({ style: { cssText: "" } }),
        body: {
            appendChild: (node: unknown) => attachedNodes.push(node),
            removeChild: (node: unknown) => {
                const index = attachedNodes.indexOf(node);
                if (index >= 0) {
                    attachedNodes.splice(index, 1);
                }
            },
        },
    };

    setGlobalValue(globalWithBrowser, "document", mockDocument);
    setGlobalValue(globalWithBrowser, "getComputedStyle", () => ({
        backgroundColor: "rgb(12, 34, 56)",
    }));

    await captureWithIOSBackground(root, async () => ({
        toCanvas: async () => null,
    }));

    assert.strictEqual(
        style.getPropertyValue("background-color"),
        "rgba(1, 2, 3, 0.4)",
        "captureWithIOSBackground should restore the previous inline background-color value.",
    );
    assert.strictEqual(
        style.getPropertyPriority("background-color"),
        "important",
        "captureWithIOSBackground should restore the previous inline background-color priority.",
    );
} finally {
    setGlobalValue(globalWithBrowser, "window", originalWindow);
    setGlobalValue(globalWithBrowser, "navigator", originalNavigator);
    setGlobalValue(globalWithBrowser, "document", originalDocument);
    setGlobalValue(
        globalWithBrowser,
        "getComputedStyle",
        originalGetComputedStyle,
    );
}
