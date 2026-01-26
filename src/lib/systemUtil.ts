/**
 * Detects the operating system name from the browser's user agent and platform.
 * @returns The OS name: "iOS", "Android", "Windows", "macOS", "Linux", or "Device" if unknown
 */
export function getOSName(): string {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "Device";
  }
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  // iOS detection
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "iOS";
  }

  // Android detection
  if (/android/.test(userAgent)) {
    return "Android";
  }

  // Windows detection
  if (/win/.test(platform) || /windows/.test(userAgent)) {
    return "Windows";
  }

  // macOS detection
  if (/mac/.test(platform) || /macintosh/.test(userAgent)) {
    return "macOS";
  }

  // Linux detection
  if (/linux/.test(platform) && !/android/.test(userAgent)) {
    return "Linux";
  }

  return "Device";
}
