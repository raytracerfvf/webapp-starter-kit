import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { NavigationProgress } from "./navigation-progress"

function createDeferred() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

function createTestRouter(loader: () => Promise<void>) {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <NavigationProgress />
        <Outlet />
      </>
    ),
  })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => null,
  })
  const slowRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/slow",
    loader,
    component: () => null,
  })
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute, slowRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("NavigationProgress", () => {
  it("delays short-wait feedback and hides it when navigation resolves", async () => {
    vi.useFakeTimers()
    const deferred = createDeferred()
    const router = createTestRouter(() => deferred.promise)
    await router.load()
    const view = render(<RouterProvider router={router} />)
    let navigation = Promise.resolve()

    act(() => {
      // The app's global route registration intentionally excludes this local test route.
      navigation = router.navigate({ to: "/slow" as never })
    })

    expect(
      view.container.querySelector('[data-slot="navigation-progress"]'),
    ).toBeNull()
    act(() => vi.advanceTimersByTime(74))
    expect(
      view.container.querySelector('[data-slot="navigation-progress"]'),
    ).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(
      view.container.querySelector('[data-slot="navigation-progress"]'),
    ).not.toBeNull()

    await act(async () => {
      deferred.resolve()
      await navigation
    })
    expect(
      view.container.querySelector('[data-slot="navigation-progress"]'),
    ).toBeNull()
  })
})
