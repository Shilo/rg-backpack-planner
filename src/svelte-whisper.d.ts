declare module "svelte-whisper" {
    import type { Readable } from "svelte/store";

    export type WhisperDictionary = Record<string, unknown>;
    export type WhisperVars = Record<string, unknown> | unknown[];

    export function init(options?: {
        fallback?: string;
        initial?: string;
        persistKey?: string;
        detect?: boolean | Record<string, string>;
    }): Promise<void>;

    export function addDictionary(
        locale: string,
        dict: WhisperDictionary,
    ): void;

    export function registerLoader(
        locale: string,
        loader: () =>
            | Promise<WhisperDictionary>
            | Promise<{ default: WhisperDictionary }>,
    ): void;

    export function setLocale(locale: string): Promise<void>;

    export function tr(
        key: string,
        vars?: WhisperVars,
    ): string;

    export function getLocales(): string[];

    export const locale: {
        subscribe: Readable<string>["subscribe"];
        set: (newLocale: string) => Promise<void>;
    };

    export const t: Readable<(key: string, vars?: WhisperVars) => string>;
}
