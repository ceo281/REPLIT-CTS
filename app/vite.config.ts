import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PWA manifest + service worker are hand-written in /public to keep the
// dependency surface (and therefore the audit surface) small.
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false, // avoid shipping source maps that could aid reverse engineering
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
});
