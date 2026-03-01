import packageInfo from "../../package.json";

const displayName =
    packageInfo.displayName ?? packageInfo.name ?? "Backpack Planner";
const shortDisplayName = displayName.split("-")[0].trim();
const version = packageInfo.version ? `v${packageInfo.version}` : "";

export const APP_DISPLAY_NAME = version
    ? `${displayName} ${version}`
    : displayName;

export const APP_SHORT_DISPLAY_NAME = version
    ? `${shortDisplayName} ${version}`
    : shortDisplayName;
