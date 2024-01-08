export default defineNuxtConfig({
    devtools: { enabled: false },
    ssr: false,
    modules: ["nuxt-electron", "nuxt-icon", "@nuxt/ui", "@vueuse/nuxt"],
    app: {
        head: {
            title: "Last.fm discord status",
        },
    },
    colorMode: {
        preference: "dark",
    },

    css: ["@/styles/global.scss"],
    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: '@use "@/styles/_colors.scss" as *;',
                },
            },
        },
    },

    electron: {
        build: [
            {
                // Main-Process entry file of the Electron App.
                entry: "electron/main.ts",
            },
            {
                entry: "electron/preload.ts",
                onstart(args) {
                    // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete,
                    // instead of restarting the entire Electron App.
                    args.reload();
                },
            },
        ],
        renderer: {},
    },
});
