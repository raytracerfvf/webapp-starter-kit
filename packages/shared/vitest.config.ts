import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    pool: "threads",
    isolate: false,
    coverage: { provider: "v8", reporter: ["text", "json", "html"] },
  },
})
