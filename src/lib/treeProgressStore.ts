import { get, type Unsubscriber } from "svelte/store";
import { treeLevels, type LevelsById } from "./treeLevelsStore";

const STORAGE_KEY = "rg-backpack-planner-tree-progress";

/**
 * Loads saved tree progress from localStorage
 * @returns The saved progress or null if not found/invalid
 */
export function loadTreeProgress(): LevelsById[] | null {
    if (typeof window === "undefined") return null;
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const parsed = JSON.parse(stored) as LevelsById[];
        
        // Validate structure: must be an array of objects
        if (
            Array.isArray(parsed) &&
            parsed.every((tree) => typeof tree === "object" && tree !== null)
        ) {
            return parsed;
        }
        
        return null;
    } catch (error) {
        console.error("Failed to load tree progress from localStorage:", error);
        return null;
    }
}

/**
 * Saves tree progress to localStorage
 * @param levels The tree levels to save
 */
export function saveTreeProgress(levels: LevelsById[]): void {
    if (typeof window === "undefined") return;
    
    try {
        const serialized = JSON.stringify(levels);
        localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
        // Handle quota exceeded or other storage errors gracefully
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
            console.warn("localStorage quota exceeded, unable to save tree progress");
        } else {
            console.error("Failed to save tree progress to localStorage:", error);
        }
    }
}

/**
 * Initializes automatic persistence of tree progress
 * Subscribes to treeLevels store and saves on every change
 * @returns Unsubscriber function to stop auto-saving
 */
export function initTreeProgressPersistence(): Unsubscriber {
    return treeLevels.subscribe((levels) => {
        // Only save if we have levels (trees are initialized)
        if (levels.length > 0) {
            saveTreeProgress(levels);
        }
    });
}

/**
 * Sets up a beforeunload event listener as a backup save mechanism
 * This ensures progress is saved even if the subscription somehow fails
 */
export function setupPageCloseSave(): void {
    if (typeof window === "undefined") return;
    
    window.addEventListener("beforeunload", () => {
        const levels = get(treeLevels);
        if (levels.length > 0) {
            saveTreeProgress(levels);
        }
    });
}
