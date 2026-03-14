import { createComposeImageFilename } from "../src/lib/composeFilename";

{
    const filename = createComposeImageFilename(
        "Default Build",
        "all",
        "kf12",
    );
    if (filename !== "default_build_all_kf12.png") {
        throw new Error(
            `Expected spaces to become underscores and suffix to append: got "${filename}"`,
        );
    }
}

{
    const filename = createComposeImageFilename(
        "My/Build:*?\"<>|",
        "all",
    );
    if (filename !== "my%2fbuild%3a%2a%3f%22%3c%3e%7c_all.png") {
        throw new Error(
            `Expected reserved filename characters to be percent-encoded: got "${filename}"`,
        );
    }
}

{
    const filename = createComposeImageFilename("Café ✅", "all");
    if (filename !== "caf%c3%a9_%e2%9c%85_all.png") {
        throw new Error(
            `Expected unicode characters to be percent-encoded: got "${filename}"`,
        );
    }
}
