// Utility helpers for working with the browser Fullscreen API in a safe, cross-browser way.
// This intentionally keeps behavior minimal: feature detection, state queries, and simple enter/exit/toggle helpers.

function isDomAvailable(): boolean {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

function getFullscreenElement(): Element | null {
  if (!isDomAvailable()) return null;

  const doc = document as unknown as Document & {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };

  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

function getRequestFullscreen(
  el: HTMLElement,
): (() => Promise<void> | void) | null {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };

  return (
    anyEl.requestFullscreen ??
    anyEl.webkitRequestFullscreen ??
    anyEl.mozRequestFullScreen ??
    anyEl.msRequestFullscreen ??
    null
  );
}

function getExitFullscreen(): (() => Promise<void> | void) | null {
  if (!isDomAvailable()) return null;

  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
  };

  return (
    doc.exitFullscreen ??
    doc.webkitExitFullscreen ??
    doc.mozCancelFullScreen ??
    doc.msExitFullscreen ??
    null
  );
}

export function isFullscreenSupported(): boolean {
  if (!isDomAvailable()) return false;
  const root = document.documentElement;
  return getRequestFullscreen(root) !== null;
}

export function isFullscreenActive(): boolean {
  return getFullscreenElement() !== null;
}

export async function enterFullscreen(
  root?: HTMLElement | null,
): Promise<boolean> {
  if (!isDomAvailable()) return false;

  const target = root ?? (document.documentElement as HTMLElement);
  const request = getRequestFullscreen(target);
  if (!request) return false;

  try {
    const result = request.call(target);
    if (result instanceof Promise) {
      await result;
    }
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<boolean> {
  if (!isDomAvailable()) return false;
  if (!isFullscreenActive()) return true;

  const exit = getExitFullscreen();
  if (!exit) return false;

  try {
    const result = exit.call(document);
    if (result instanceof Promise) {
      await result;
    }
    return true;
  } catch {
    return false;
  }
}

export async function toggleFullscreen(
  root?: HTMLElement | null,
): Promise<boolean> {
  if (!isDomAvailable()) return false;
  if (isFullscreenActive()) {
    return exitFullscreen();
  }
  return enterFullscreen(root);
}

