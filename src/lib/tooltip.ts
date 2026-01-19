import { writable } from "svelte/store";
import { LONG_PRESS_MOVE_THRESHOLD, LONG_PRESS_MS } from "./longPress";

type TooltipState = {
  isOpen: boolean;
  text: string;
  x: number;
  y: number;
};

type Point = { x: number; y: number };

const PRESS_DELAY_MS = LONG_PRESS_MS + 60;
const HOVER_DELAY_MS = 500;

export const tooltipStore = writable<TooltipState>({
  isOpen: false,
  text: "",
  x: 0,
  y: 0,
});

const suppressedPointerIds = new Set<number>();
let currentOwner: HTMLElement | null = null;

function showTooltip(owner: HTMLElement, text: string, point: Point) {
  currentOwner = owner;
  tooltipStore.set({
    isOpen: true,
    text,
    x: point.x,
    y: point.y,
  });
}

function updateTooltipText(owner: HTMLElement, text: string) {
  if (currentOwner !== owner) return;
  tooltipStore.update((state) =>
    state.isOpen ? { ...state, text } : state,
  );
}

function updateTooltip(owner: HTMLElement, point: Point) {
  if (currentOwner !== owner) return;
  tooltipStore.update((state) =>
    state.isOpen ? { ...state, x: point.x, y: point.y } : state,
  );
}

export function hideTooltip(owner?: HTMLElement) {
  if (owner && currentOwner !== owner) return;
  currentOwner = null;
  tooltipStore.set({
    isOpen: false,
    text: "",
    x: 0,
    y: 0,
  });
}

export function suppressTooltip(pointerId: number | null) {
  if (pointerId === null) return;
  suppressedPointerIds.add(pointerId);
}

export function clearTooltipSuppression(pointerId: number | null) {
  if (pointerId === null) return;
  suppressedPointerIds.delete(pointerId);
}

function isSuppressed(pointerId: number | null) {
  return pointerId !== null && suppressedPointerIds.has(pointerId);
}

export function tooltip(node: HTMLElement, _value?: unknown) {
  let text = node.getAttribute("data-tooltip") ?? "";
  let hoverTimer: number | null = null;
  let pressTimer: number | null = null;
  let activePointerId: number | null = null;
  let lastPoint: Point = { x: 0, y: 0 };
  let pressStart: Point | null = null;
  let observer: MutationObserver | null = null;
  let globalPointerEnd: ((event: PointerEvent) => void) | null = null;

  const canHover = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const clearHoverTimer = () => {
    if (hoverTimer !== null) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  };

  const clearPressTimer = () => {
    if (pressTimer !== null) {
      window.clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const refreshText = () => {
    text = node.getAttribute("data-tooltip") ?? "";
    updateTooltipText(node, text);
  };

  const scheduleHover = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    if (!canHover() || !text) return;
    lastPoint = { x: event.clientX, y: event.clientY };
    clearHoverTimer();
    hoverTimer = window.setTimeout(() => {
      showTooltip(node, text, lastPoint);
    }, HOVER_DELAY_MS);
  };

  const schedulePress = (event: PointerEvent) => {
    if (event.pointerType !== "touch") return;
    if (!text) return;
    activePointerId = event.pointerId;
    pressStart = { x: event.clientX, y: event.clientY };
    lastPoint = { x: event.clientX, y: event.clientY };
    clearPressTimer();
    pressTimer = window.setTimeout(() => {
      if (isSuppressed(activePointerId)) return;
      showTooltip(node, text, lastPoint);
    }, PRESS_DELAY_MS);
  };

  const handlePointerEnter = (event: PointerEvent) => {
    scheduleHover(event);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (pressTimer !== null && pressStart) {
      const distance = Math.hypot(
        event.clientX - pressStart.x,
        event.clientY - pressStart.y,
      );
      if (distance > LONG_PRESS_MOVE_THRESHOLD) {
        clearPressTimer();
        pressStart = null;
      }
    }
    if (event.pointerType === "touch") {
      return;
    }
    lastPoint = { x: event.clientX, y: event.clientY };
    updateTooltip(node, lastPoint);
  };

  const handlePointerLeave = () => {
    clearHoverTimer();
    hideTooltip(node);
  };

  const handlePointerDown = (event: PointerEvent) => {
    clearHoverTimer();
    schedulePress(event);
    if (event.pointerType === "touch") {
      attachGlobalPointerEnd(event.pointerId);
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    clearPressTimer();
    hideTooltip(node);
    clearTooltipSuppression(event.pointerId);
    activePointerId = null;
    pressStart = null;
  };

  const handlePointerCancel = (event: PointerEvent) => {
    clearPressTimer();
    hideTooltip(node);
    clearTooltipSuppression(event.pointerId);
    activePointerId = null;
    pressStart = null;
  };

  const attachGlobalPointerEnd = (pointerId: number) => {
    if (globalPointerEnd) {
      window.removeEventListener("pointerup", globalPointerEnd, true);
      window.removeEventListener("pointercancel", globalPointerEnd, true);
    }
    globalPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      handlePointerUp(event);
      if (globalPointerEnd) {
        window.removeEventListener("pointerup", globalPointerEnd, true);
        window.removeEventListener("pointercancel", globalPointerEnd, true);
        globalPointerEnd = null;
      }
    };
    window.addEventListener("pointerup", globalPointerEnd, true);
    window.addEventListener("pointercancel", globalPointerEnd, true);
  };

  node.addEventListener("pointerenter", handlePointerEnter);
  node.addEventListener("pointermove", handlePointerMove);
  node.addEventListener("pointerleave", handlePointerLeave);
  node.addEventListener("pointerdown", handlePointerDown);
  node.addEventListener("pointerup", handlePointerUp);
  node.addEventListener("pointercancel", handlePointerCancel);
  observer = new MutationObserver(refreshText);
  observer.observe(node, { attributes: true, attributeFilter: ["data-tooltip"] });

  return {
    update() {
      queueMicrotask(refreshText);
    },
    destroy() {
      clearHoverTimer();
      clearPressTimer();
      hideTooltip(node);
      pressStart = null;
      observer?.disconnect();
      if (globalPointerEnd) {
        window.removeEventListener("pointerup", globalPointerEnd, true);
        window.removeEventListener("pointercancel", globalPointerEnd, true);
        globalPointerEnd = null;
      }
      node.removeEventListener("pointerenter", handlePointerEnter);
      node.removeEventListener("pointermove", handlePointerMove);
      node.removeEventListener("pointerleave", handlePointerLeave);
      node.removeEventListener("pointerdown", handlePointerDown);
      node.removeEventListener("pointerup", handlePointerUp);
      node.removeEventListener("pointercancel", handlePointerCancel);
    },
  };
}
