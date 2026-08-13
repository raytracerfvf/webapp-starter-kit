import { clientEnv } from "../env/client"
import type { ProductEvent } from "./events"

let initialized = false

export async function captureProductEvent(
  event: ProductEvent,
  properties: Record<string, string | number | boolean> = {},
) {
  const key = clientEnv.VITE_POSTHOG_KEY
  if (!key || typeof window === "undefined") return
  const { default: posthog } = await import("posthog-js")
  if (!initialized) {
    posthog.init(key, {
      api_host: "https://us.i.posthog.com",
      persistence: "memory",
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
    })
    initialized = true
  }
  posthog.capture(event, properties)
}
