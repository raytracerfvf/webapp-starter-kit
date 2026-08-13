import { QueryErrorResetBoundary } from "@tanstack/react-query"
import {
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DefaultErrorComponent } from "./error-boundary"

afterEach(cleanup)

describe("DefaultErrorComponent", () => {
  it("resets query errors and reloads the active route", () => {
    const router = createRouter({ routeTree: createRootRoute() })
    const invalidate = vi.spyOn(router, "invalidate").mockResolvedValue()
    const resetRoute = vi.fn()
    let isQueryReset = () => false

    render(
      <QueryErrorResetBoundary>
        {(boundary) => {
          isQueryReset = boundary.isReset
          return (
            <RouterContextProvider router={router}>
              <DefaultErrorComponent
                error={new Error("failed")}
                reset={resetRoute}
              />
            </RouterContextProvider>
          )
        }}
      </QueryErrorResetBoundary>,
    )

    expect(isQueryReset()).toBe(true)
    fireEvent.click(screen.getByRole("button"))
    expect(resetRoute).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledOnce()
  })
})
