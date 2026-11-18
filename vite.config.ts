import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";
import { THEME_BG } from "./scripts/theme-defaults.ts";

// https://vite.dev/config/
export default defineConfig({
    base: "/",
    build: {
        rollupOptions: {
            output: {
                // Locale chunks get a fixed prefix so the service worker can leave them
                // out of the precache and fetch only the language in use.
                chunkFileNames(chunk) {
                    return chunk.facadeModuleId?.includes("/src/locales/")
                        ? "assets/locale-[name]-[hash].js"
                        : "assets/[name]-[hash].js";
                },
                manualChunks(id) {
                    if (id.includes("node_modules/svelte/")) {
                        return "svelte";
                    }
                    if (id.includes("node_modules/phosphor-svelte/")) {
                        return "icons";
                    }
                },
            },
        },
    },
    plugins: [
        svelte(),
        VitePWA({
            registerType: "autoUpdate",
            workbox: {
                // Installing the app should not download every language. Each locale
                // chunk is cached the first time it is used instead.
                globIgnores: ["**/assets/locale-*.js"],
                runtimeCaching: [
                    {
                        urlPattern: /\/assets\/locale-[\w-]+\.js$/,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "locales",
                            expiration: { maxEntries: 20 },
                        },
                    },
                ],
            },
            includeAssets: [
                "favicon.ico",
                "icon.svg",
                "apple-touch-icon-180x180.png",
                "og-512x512.png",
            ],
            manifest: {
                name: "Backpack Planner",
                short_name: "BP Planner",
                description: "Plan and share Backpack Tech builds.",
                start_url: ".",
                display: "standalone",
                background_color: THEME_BG,
                theme_color: THEME_BG,
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "maskable-icon-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
        }),
    ],
});
