import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { brotliCompress, gzip, constants as zlibConstants } from "node:zlib"

import contentCollections from "@content-collections/vite"
import { paraglideVitePlugin } from "@inlang/paraglide-js"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig, type Plugin } from "vite"
import { imagetools } from "vite-imagetools"

const gzipAsync = promisify(gzip)
const brotliAsync = promisify(brotliCompress)
const compressible = /\.(js|mjs|css|html|svg|json|wasm|txt|xml)$/

function appVersion() {
  if (process.env.APP_VERSION) return process.env.APP_VERSION
  try {
    return execFileSync("git", ["describe", "--tags", "--always", "--dirty"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return "unknown"
  }
}

function precompressClientAssets(): Plugin {
  return {
    name: "precompress-client-assets",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    async closeBundle() {
      const outputDirectory = path.resolve(
        this.environment.config.root,
        this.environment.config.build.outDir,
      )
      const files: string[] = []
      async function walk(directory: string) {
        for (const entry of await fs.readdir(directory, {
          withFileTypes: true,
        })) {
          const absolutePath = path.join(directory, entry.name)
          if (entry.isDirectory()) await walk(absolutePath)
          else if (compressible.test(entry.name)) files.push(absolutePath)
        }
      }
      await walk(outputDirectory)
      await Promise.all(
        files.map(async (file) => {
          const source = await fs.readFile(file)
          if (source.length < 1_024) return
          const [gzipped, brotlied] = await Promise.all([
            gzipAsync(source, { level: 9 }),
            brotliAsync(source, {
              params: {
                [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
                [zlibConstants.BROTLI_PARAM_SIZE_HINT]: source.length,
              },
            }),
          ])
          await Promise.all([
            fs.writeFile(`${file}.gz`, gzipped),
            fs.writeFile(`${file}.br`, brotlied),
          ])
        }),
      )
    },
  }
}

export default defineConfig({
  envDir: path.resolve(import.meta.dirname, "../.."),
  resolve: { tsconfigPaths: true },
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  server: { port: 3000 },
  build: { sourcemap: true },
  environments: { client: { build: {} } },
  assetsInclude: ["**/*.wasm"],
  plugins: [
    devtools({ injectSource: { enabled: false } }),
    contentCollections(),
    paraglideVitePlugin({
      project: "./i18n/project.inlang",
      outdir: "./i18n/paraglide",
      outputStructure: "message-modules",
      cookieName: "PARAGLIDE_LOCALE",
      strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
      routeStrategies: [
        {
          match: "/api/:path(.*)?",
          strategy: ["cookie", "preferredLanguage", "baseLocale"],
        },
        {
          match: "/_serverFn/:path(.*)?",
          strategy: ["cookie", "preferredLanguage", "baseLocale"],
        },
      ],
    }),
    tailwindcss(),
    imagetools(),
    tanstackStart({
      importProtection: { ignoreImporters: ["**/start.ts"] },
      serverFns: {
        generateFunctionId: ({ filename, functionName }) =>
          `${createHash("sha1").update(`${filename}--${functionName}`).digest("hex").slice(0, 8)}--${functionName}`,
      },
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    precompressClientAssets(),
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: "stats.html",
            gzipSize: true,
            brotliSize: true,
            emitFile: true,
          }),
        ]
      : []),
  ],
})
