import { queryOptions } from "@tanstack/react-query"

import { getSessionContextFn } from "./session"

export const sessionKeys = { all: ["auth", "session"] as const }

export function sessionQueryOptions() {
  return queryOptions({
    queryKey: sessionKeys.all,
    queryFn: () => getSessionContextFn(),
    staleTime: 0,
  })
}
