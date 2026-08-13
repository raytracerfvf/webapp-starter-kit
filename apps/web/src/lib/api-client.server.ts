import "@tanstack/react-start/server-only"

import { createHmac } from "node:crypto"

import { createClient, createConfig } from "@repo/api-client/client"

import { serverEnv } from "./env/server"

// A hung Python service must not hang the calling server function; the generated
// client catches the timeout rejection and surfaces it as `result.error`.
const PYTHON_SERVICE_TIMEOUT_MS = 10_000

// Signing lives in the client's fetch so the HMAC covers the exact bytes on
// the wire; call sites only pass typed bodies.
const signingFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init)
  const body = await request.clone().text()
  const timestamp = Math.floor(Date.now() / 1_000).toString()
  const signature = createHmac(
    "sha256",
    serverEnv.PYTHON_SERVICE_SIGNING_SECRET,
  )
    .update(`${timestamp}.${body}`)
    .digest("hex")
  request.headers.set("x-timestamp", timestamp)
  request.headers.set("x-signature", signature)
  // AbortSignal.any keeps caller-initiated cancellation working alongside
  // the timeout budget.
  return fetch(request, {
    signal: AbortSignal.any([
      request.signal,
      AbortSignal.timeout(PYTHON_SERVICE_TIMEOUT_MS),
    ]),
  })
}

// Null when PYTHON_SERVICE_URL is unset; the Python service is optional.
export const pythonServiceClient = serverEnv.PYTHON_SERVICE_URL
  ? createClient(
      createConfig({
        baseUrl: serverEnv.PYTHON_SERVICE_URL,
        fetch: signingFetch,
      }),
    )
  : null
