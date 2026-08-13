import { createFileRoute } from "@tanstack/react-router"

import { robotsText } from "@/lib/seo/routes"

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(robotsText(), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    },
  },
})
