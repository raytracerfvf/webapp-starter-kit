import {
  dehydrate,
  QueryClient,
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createRootRoute } from "@tanstack/react-router"
import { cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function HeaderStub() {
  return null
}

beforeEach(() => {
  // Vitest runs with isolate: false; discard modules loaded by earlier files
  // before installing this file's route and environment mocks.
  vi.resetModules()
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-that-is-long-enough-123")
  vi.doMock("./routeTree.gen", () => ({ routeTree: createRootRoute() }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.doUnmock("./routeTree.gen")
  vi.resetModules()
})

describe("router loading integration", () => {
  it("hydrates prefetched data through the router QueryClient provider", async () => {
    const { getRouter } = await import("./router")
    const router = getRouter()
    const queryClient = router.options.context.queryClient
    const Wrap = router.options.Wrap
    if (!Wrap) throw new Error("Query integration did not install a provider")
    const hydrate = router.options.hydrate
    if (!hydrate) throw new Error("Query integration did not install hydration")

    const queryFn = vi.fn(async () => "fetched")
    const options = queryOptions({ queryKey: ["prefetched"], queryFn })
    const serverQueryClient = new QueryClient()
    serverQueryClient.setQueryData(options.queryKey, "prefetched")
    await hydrate({
      dehydratedQueryClient: dehydrate(serverQueryClient),
      queryStream: new ReadableStream({
        start(controller) {
          controller.close()
        },
      }),
    })
    const view = renderHook(
      () => ({
        client: useQueryClient(),
        result: useSuspenseQuery(options).data,
      }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <Wrap>{children}</Wrap>
        ),
      },
    )

    expect(router.options.defaultPendingMs).toBe(200)
    expect(router.options.defaultPendingMinMs).toBe(500)
    expect(view.result.current.client).toBe(queryClient)
    expect(view.result.current.result).toBe("prefetched")
    expect(queryFn).not.toHaveBeenCalled()
  })

  it("keeps the root route out of a Suspense boundary despite the router pending default", async () => {
    // Since router 1.170.19 an inherited defaultPendingComponent wraps the root
    // match — including <html> — in a Suspense boundary React cannot hydrate,
    // silently discarding every SSR document (TanStack/router#8053). The router
    // keeps its pending default for child routes, so the root must opt out.
    // The root route module reaches server-only modules through the session
    // server fn and the header component tree; neither affects route options.
    vi.doMock("@/lib/auth/session-query", () => ({
      sessionQueryOptions: vi.fn(),
    }))
    vi.doMock("@/components/layout/header", () => ({ Header: HeaderStub }))
    const [{ getRouter }, { Route }] = await Promise.all([
      import("./router"),
      import("./routes/__root"),
    ])
    expect(getRouter().options.defaultPendingComponent).toBeDefined()
    expect(Route.options.wrapInSuspense).toBe(false)
  })
})
