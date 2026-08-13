import { createFileRoute } from "@tanstack/react-router"

import { analyzeV1AnalyzePost } from "@repo/api-client"

import { pythonServiceClient } from "@/lib/api-client.server"
import { serverEnv } from "@/lib/env/server"
import { getRequestLogger } from "@/lib/middleware/request-context.server"

// Reference consumer of the generated Python service client. Removing the service =
// its two packages + this route + lib/api-client.server.ts + the
// @repo/api-client dep + the PYTHON_SERVICE_* env keys.
export const Route = createFileRoute("/api/python-service-demo")({
  server: {
    handlers: {
      GET: async () => {
        if (!pythonServiceClient) {
          return Response.json({ pythonService: "unconfigured" })
        }
        const result = await analyzeV1AnalyzePost({
          client: pythonServiceClient,
          body: { text: "The starter wires the generated client end to end." },
        })
        if (result.error !== undefined || !result.data || result.data.error) {
          // Network failures surface as an Error in result.error; its props
          // are non-enumerable, so log the message. HTTP failures carry the
          // typed ErrorEnvelope body instead.
          getRequestLogger().error(
            {
              url: serverEnv.PYTHON_SERVICE_URL,
              status: result.response?.status,
              upstreamError:
                result.error instanceof Error
                  ? result.error.message
                  : (result.error ?? result.data?.error),
            },
            "[python-service-demo] analyze failed",
          )
          // Upstream error details stay in the logs, never in the response.
          return Response.json({ pythonService: "error" }, { status: 502 })
        }
        return Response.json({
          pythonService: "ok",
          analysis: result.data.data,
        })
      },
    },
  },
})
