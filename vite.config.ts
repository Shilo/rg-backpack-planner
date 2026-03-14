import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { THEME_BG } from "./scripts/theme-defaults.ts";

// https://vite.dev/config/
export default defineConfig({
    base: "/",
    plugins: [
        basicSsl(), // HTTPS in dev so Clipboard/Share APIs work on mobile
        svelte(),
        VitePWA({
            registerType: "autoUpdate",
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
