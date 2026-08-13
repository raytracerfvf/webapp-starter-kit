import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

try {
  const parsed = parseEnv(
    readFileSync(new URL("../.env", import.meta.url), "utf8"),
  )
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error
}
