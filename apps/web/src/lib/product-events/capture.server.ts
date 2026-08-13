import "@tanstack/react-start/server-only"

import type { ProductEvent } from "./events"

export async function captureServer(_event: ProductEvent, _userId: string) {
  // Server analytics is intentionally best-effort and disabled until a private server key is configured.
  return Promise.resolve()
}
