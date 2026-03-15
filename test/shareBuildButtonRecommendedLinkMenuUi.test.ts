import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const shareButtonPath = resolve("src/lib/buttons/ShareBuildButton.svelte");
const enLocalePath = resolve("src/locales/en.json");
const jaLocalePath = resolve("src/locales/ja.json");
const zhLocalePath = resolve("src/locales/zh.json");

const shareButtonSource = readFileSync(shareButtonPath, "utf8");
const enLocale = JSON.parse(readFileSync(enLocalePath, "utf8"));
const jaLocale = JSON.parse(readFileSync(jaLocalePath, "utf8"));
const zhLocale = JSON.parse(readFileSync(zhLocalePath, "utf8"));

if (!shareButtonSource.includes("ArrowsOutLineHorizontalIcon")) {
    throw new Error(
        "ShareBuildButton should use ArrowsOutLineHorizontalIcon for the full recommended URL choice",
    );
}

if (!shareButtonSource.includes("ArrowsInLineHorizontalIcon")) {
    throw new Error(
        "ShareBuildButton should use ArrowsInLineHorizontalIcon for the short recommended URL choice",
    );
}

if (!shareButtonSource.includes("description={choice.displayUrl}")) {
    throw new Error(
        "ShareBuildButton should render the recommended share URL as a secondary button description",
    );
}

if (!shareButtonSource.includes('$t("share.fullUrlChoice")')) {
    throw new Error(
        "ShareBuildButton should use the new share.fullUrlChoice label for the full recommended URL row",
    );
}

if (!shareButtonSource.includes('$t("share.shortUrlChoice")')) {
    throw new Error(
        "ShareBuildButton should use the new share.shortUrlChoice label for the short recommended URL row",
    );
}

if (
    !/title=\{\s*linkMenuAction === "copy"\s*\?\s*\$t\("share\.copyLink"\)\s*:\s*\$t\("share\.shareLinkMenuTitle"\)\s*\}/s.test(
        shareButtonSource,
    )
) {
    throw new Error(
        "ShareBuildButton should switch the child menu title between Copy Link and Share Link based on the chosen action",
    );
}

if (shareButtonSource.includes('share.fullLinkChoice') || shareButtonSource.includes('share.shortLinkChoice')) {
    throw new Error(
        "ShareBuildButton should no longer inline the URL into the main label text",
    );
}

if (enLocale.share?.fullUrlChoice !== "Full URL") {
    throw new Error('English locale should label the full recommended share row as "Full URL"');
}

if (enLocale.share?.shortUrlChoice !== "Short URL") {
    throw new Error('English locale should label the short recommended share row as "Short URL"');
}

if (typeof jaLocale.share?.fullUrlChoice !== "string" || typeof jaLocale.share?.shortUrlChoice !== "string") {
    throw new Error("Japanese locale should define fullUrlChoice and shortUrlChoice");
}

if (typeof zhLocale.share?.fullUrlChoice !== "string" || typeof zhLocale.share?.shortUrlChoice !== "string") {
    throw new Error("Chinese locale should define fullUrlChoice and shortUrlChoice");
}
