import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
    base: "/rg-backpack-planner/",
    plugins: [
        svelte(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                "favicon.ico",
                "icon.svg",
                "apple-touch-icon-180x180.png",
            ],
            manifest: {
                name: "Backpack Planner",
                short_name: "BP Planner",
                description: "Plan and share Backpack Tech builds.",
                start_url: ".",
                display: "standalone",
                background_color: "#060b16",
                theme_color: "#060b16",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
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
