import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getSessionContextFn } from "./session"
import { sessionQueryOptions } from "./session-query"

vi.mock("./session", () => ({ getSessionContextFn: vi.fn() }))

beforeEach(() => {
  vi.mocked(getSessionContextFn).mockReset()
})

describe("sessionQueryOptions", () => {
  it("checks the session again after the previous request completes", async () => {
    vi.mocked(getSessionContextFn).mockResolvedValue({
      session: null,
      socialProviders: { google: false, github: false },
    })
    // Mirrors the app's global staleTime (router.tsx); the session query must
    // override it, or a signed-out user keeps their session for five minutes.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 5 * 60 * 1_000 },
      },
    })

    await queryClient.fetchQuery(sessionQueryOptions())
    await queryClient.fetchQuery(sessionQueryOptions())

    expect(getSessionContextFn).toHaveBeenCalledTimes(2)
  })
})
