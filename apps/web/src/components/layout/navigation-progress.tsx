import { useRouterState } from "@tanstack/react-router"
import { useEffect, useState } from "react"

const showDelayMs = 75

export function NavigationProgress() {
  const isRouteLoading = useRouterState({
    select: (state) =>
      state.isLoading ||
      (state.resolvedLocation !== undefined &&
        state.location.href !== state.resolvedLocation.href),
  })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setVisible(isRouteLoading),
      isRouteLoading ? showDelayMs : 0,
    )
    return () => window.clearTimeout(timeout)
  }, [isRouteLoading])

  if (!isRouteLoading || !visible) return null

  return (
    <div
      aria-hidden="true"
      data-slot="navigation-progress"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-0.5 overflow-hidden"
    >
      <div className="route-progress-indicator h-full w-1/3 bg-primary motion-reduce:w-full" />
    </div>
  )
}
