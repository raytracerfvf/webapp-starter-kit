import { createCsrfMiddleware, createStart } from "@tanstack/react-start"

import { errorSanitizerMiddleware } from "./lib/middleware/error-sanitizer"
import { fnGuardMiddleware } from "./lib/middleware/fn-guard"
import { loggingMiddleware } from "./lib/middleware/logging"
import { paraglideRequestMiddleware } from "./lib/middleware/paraglide"
import { securityHeadersMiddleware } from "./lib/middleware/security-headers"
import { seoHeadersMiddleware } from "./lib/middleware/seo-headers"

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    paraglideRequestMiddleware,
    // Logging first: it owns the request context the sanitizer logs into.
    loggingMiddleware,
    errorSanitizerMiddleware,
    securityHeadersMiddleware,
    csrfMiddleware,
    seoHeadersMiddleware,
  ],
  functionMiddleware: [fnGuardMiddleware],
}))
