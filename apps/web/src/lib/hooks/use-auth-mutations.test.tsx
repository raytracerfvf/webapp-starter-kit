import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { authClient } from "@/lib/auth/client"

import { useSignOutMutation } from "./use-auth-mutations"

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { magicLink: vi.fn(), social: vi.fn() },
    signOut: vi.fn(),
  },
}))

function createDeferred() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

function renderSignOut(queryClient: QueryClient) {
  const router = createRouter({ routeTree: createRootRoute() })
  const view = renderHook(() => useSignOutMutation(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <RouterContextProvider router={router}>
          {children}
        </RouterContextProvider>
      </QueryClientProvider>
    ),
  })
  return { router, view }
}

beforeEach(() => {
  vi.mocked(authClient.signOut).mockReset()
})

afterEach(cleanup)

describe("useSignOutMutation", () => {
  it("stays pending until cached data is cleared and auth context is rebuilt", async () => {
    vi.mocked(authClient.signOut).mockResolvedValue({
      data: { success: true },
      error: null,
    })
    const queryClient = new QueryClient()
    queryClient.setQueryData(["private"], "cached")
    const { router, view } = renderSignOut(queryClient)
    const invalidation = createDeferred()
    const invalidate = vi
      .spyOn(router, "invalidate")
      .mockReturnValue(invalidation.promise)

    act(() => view.result.current.mutate())

    await waitFor(() => expect(invalidate).toHaveBeenCalledOnce())
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(view.result.current.isPending).toBe(true)

    invalidation.resolve()
    await waitFor(() => expect(view.result.current.isPending).toBe(false))
    expect(view.result.current.isSuccess).toBe(true)
  })

  it("preserves cached data when sign-out fails", async () => {
    vi.mocked(authClient.signOut).mockRejectedValue(new Error("network down"))
    const queryClient = new QueryClient()
    queryClient.setQueryData(["private"], "cached")
    const { router, view } = renderSignOut(queryClient)
    const invalidate = vi.spyOn(router, "invalidate")

    act(() => view.result.current.mutate())

    await waitFor(() => expect(view.result.current.isError).toBe(true))
    expect(queryClient.getQueryData(["private"])).toBe("cached")
    expect(invalidate).not.toHaveBeenCalled()
  })
})
