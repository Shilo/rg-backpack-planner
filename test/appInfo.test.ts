import packageInfo from "../package.json";
import {
    APP_DISPLAY_NAME,
    APP_DISPLAY_NAME_FULL,
} from "../src/lib/appInfo.ts";

const VERSION_SUFFIX = packageInfo.version ? ` v${packageInfo.version}` : "";
const DISPLAY_NAME_SEPARATOR = " - ";
const expectedShortDisplayName =
    `${packageInfo.displayName ?? packageInfo.name ?? "Backpack Planner"}${VERSION_SUFFIX}`;
const expectedFullDisplayName = packageInfo.game?.name
    ? `${packageInfo.displayName ?? packageInfo.name ?? "Backpack Planner"}${DISPLAY_NAME_SEPARATOR}${packageInfo.game.name}${VERSION_SUFFIX}`
    : expectedShortDisplayName;

if (APP_DISPLAY_NAME !== expectedShortDisplayName) {
    throw new Error(
        `APP_DISPLAY_NAME mismatch. Expected "${expectedShortDisplayName}", got "${APP_DISPLAY_NAME}"`,
    );
}

if (APP_DISPLAY_NAME_FULL !== expectedFullDisplayName) {
    throw new Error(
        `APP_DISPLAY_NAME_FULL mismatch. Expected "${expectedFullDisplayName}", got "${APP_DISPLAY_NAME_FULL}"`,
    );
}
