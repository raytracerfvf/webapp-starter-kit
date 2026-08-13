import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import path from "node:path"

import sirv from "sirv"
import { NodeRequest, sendNodeResponse } from "srvx/node"

interface StartServer {
  fetch(
    request: Request,
    options?: { responseLinkHeader?: boolean },
  ): Response | Promise<Response>
}

const entryUrl = new URL("./dist/server/server.js", import.meta.url).href
const loadedEntry: unknown = await import(entryUrl)
if (
  typeof loadedEntry !== "object" ||
  loadedEntry === null ||
  !("default" in loadedEntry) ||
  !isStartServer(loadedEntry.default)
) {
  throw new Error("The production server build has an invalid entry module")
}
const entry = loadedEntry.default
const clientDirectory = path.join(import.meta.dirname, "dist/client")
const port = Number(process.env.PORT ?? "3000")

if (!Number.isSafeInteger(port) || port < 1 || port > 65_535)
  throw new Error("PORT must be a valid TCP port")

const serveStatic = sirv(clientDirectory, {
  brotli: true,
  gzip: true,
  etag: true,
  setHeaders(response, pathname) {
    response.setHeader(
      "Cache-Control",
      pathname.startsWith("assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    )
  },
})

function isStartServer(value: unknown): value is StartServer {
  return (
    typeof value === "object" &&
    value !== null &&
    "fetch" in value &&
    typeof value.fetch === "function"
  )
}

async function serveApp(request: IncomingMessage, response: ServerResponse) {
  const webRequest = new NodeRequest({ req: request, res: response })
  const webResponse = await entry.fetch(webRequest, {
    responseLinkHeader: true,
  })
  await sendNodeResponse(response, webResponse)
}

const server = createServer((request, response) => {
  serveStatic(request, response, () => {
    response.setHeader("Cache-Control", "no-store")
    void serveApp(request, response).catch((error: unknown) => {
      console.error("[web] request failed", error)
      if (!response.headersSent) {
        response.statusCode = 500
        response.setHeader("content-type", "text/plain; charset=utf-8")
      }
      response.end("Internal Server Error")
    })
  })
})

server.listen(port, "0.0.0.0", () => {
  console.info(`[web] listening on http://0.0.0.0:${port}`)
})

function shutdown(signal: NodeJS.Signals) {
  console.info(`[web] received ${signal}; draining connections`)
  server.close((error) => {
    if (error) {
      console.error("[web] graceful shutdown failed", error)
      process.exitCode = 1
    }
  })
  server.closeIdleConnections()
  setTimeout(() => server.closeAllConnections(), 10_000).unref()
}

process.once("SIGTERM", shutdown)
process.once("SIGINT", shutdown)
