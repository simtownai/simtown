import { defineConfig } from "vite"

export default defineConfig({
  resolve: {
    alias: {
      phaser: "phaser/dist/phaser.js",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
})
