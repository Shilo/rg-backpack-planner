// Lets Node import Svelte runes modules (`*.svelte.js` / `*.svelte.ts`), such as
// svelte-whisper, which the app's Vite plugin compiles in the browser build.
// Load before the tests: `tsx --import ./test/svelteModules.ts test/index.ts`.
import { register } from "node:module";

register(
    "data:text/javascript," +
        encodeURIComponent(`
import { compileModule } from ${JSON.stringify(import.meta.resolve("svelte/compiler"))};
import { fileURLToPath } from "node:url";

export async function load(url, context, nextLoad) {
    const result = await nextLoad(url, context);
    if (!/\\.svelte\\.(js|ts)$/.test(new URL(url).pathname)) return result;
    const source = String(result.source);
    const { js } = compileModule(source, { filename: fileURLToPath(url), generate: "server" });
    return { ...result, format: "module", source: js.code, shortCircuit: true };
}
`),
    import.meta.url,
);
