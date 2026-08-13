import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  // tsconfig uses jsx: preserve; tests need the plugin so .test.tsx parses.
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    pool: "threads",
    isolate: false,
    coverage: { provider: "v8", reporter: ["text", "json", "html"] },
  },
})
