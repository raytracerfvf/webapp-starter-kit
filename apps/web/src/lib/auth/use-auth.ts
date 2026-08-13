import { useRouteContext } from "@tanstack/react-router"

export const useAuth = () =>
  useRouteContext({ from: "__root__", select: (context) => context.auth })
