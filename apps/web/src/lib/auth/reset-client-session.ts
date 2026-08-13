import type { QueryClient } from "@tanstack/react-query"

export async function resetClientSession(
  queryClient: QueryClient,
  invalidateRouter: () => Promise<void>,
) {
  queryClient.clear()
  await invalidateRouter()
}
