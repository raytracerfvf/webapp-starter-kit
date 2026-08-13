// typescript@6 is pinned (not catalog:): openapi-ts drives the TS compiler API
// at runtime, which the native TS 7 tsc no longer exposes. codegen emits dist/
// with this package's relaxed tsconfig so consumers skipLibCheck the generated
// internals instead of holding them to app strictness.
import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "../../apps/api-python/openapi.json",
  output: { path: "src/client", postProcess: [] },
  plugins: ["@hey-api/typescript", "@hey-api/sdk", "@hey-api/client-fetch"],
})
