import packageInfo from "../../package.json";

const DISPLAY_NAME_SEPARATOR = " - ";
const displayName =
    packageInfo.displayName ?? packageInfo.name ?? "Backpack Planner";
const fullDisplayName = packageInfo.game?.name
    ? `${displayName}${DISPLAY_NAME_SEPARATOR}${packageInfo.game.name}`
    : displayName;
const version = packageInfo.version ? `v${packageInfo.version}` : "";

export const APP_DISPLAY_NAME = version
    ? `${displayName} ${version}`
    : displayName;

export const APP_DISPLAY_NAME_FULL = version
    ? `${fullDisplayName} ${version}`
    : fullDisplayName;
