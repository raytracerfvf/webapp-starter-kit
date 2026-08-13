import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { DefaultErrorComponent } from "@/components/router/error-boundary"
import { DefaultNotFoundComponent } from "@/components/router/not-found"
import { DefaultPendingComponent } from "@/components/router/pending-spinner"
import { deLocalizeUrl, localizeUrl } from "@/i18n"
import { resetClientSession } from "@/lib/auth/reset-client-session"
import { decodeHttpError, shouldRetryQuery } from "@/lib/errors"
import { captureProductEvent } from "@/lib/product-events/client"
import { ProductEvent } from "@/lib/product-events/events"

import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error) => report("query", error) }),
    mutationCache: new MutationCache({
      onError: (error) => report("mutation", error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1_000,
        gcTime: 30 * 60 * 1_000,
        retry: shouldRetryQuery,
      },
    },
  })
  function report(scope: string, error: unknown) {
    if (typeof window === "undefined") return
    const status = decodeHttpError(error)?.statusCode
    // 404s are an expected flow (route boundaries render them); don't log.
    if (status !== 404) console.error(`[${scope}] failed`, error)
    if (status === 401) {
      void resetClientSession(queryClient, () => router.invalidate())
    }
  }
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      auth: {
        user: null,
        session: null,
        isAuthenticated: false,
        socialProviders: { google: false, github: false },
      },
    },
    defaultErrorComponent: DefaultErrorComponent,
    defaultNotFoundComponent: DefaultNotFoundComponent,
    defaultPendingComponent: DefaultPendingComponent,
    defaultPendingMs: 200,
    defaultPendingMinMs: 500,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    scrollRestoration: true,
  })
  router.subscribe("onResolved", ({ toLocation }) => {
    void captureProductEvent(ProductEvent.PAGE_VIEWED, {
      path: toLocation.href,
    })
  })
  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}
