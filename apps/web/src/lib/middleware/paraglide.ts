import { createMiddleware } from "@tanstack/react-start"

import { paraglideMiddleware } from "../../../i18n/paraglide/server.js"

export const paraglideRequestMiddleware = createMiddleware({
  type: "request",
}).server(({ request, next }) =>
  paraglideMiddleware(request, async () => (await next()).response),
)
