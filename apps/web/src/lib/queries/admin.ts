import { queryOptions } from "@tanstack/react-query"

import type { AdminUsersPageInput } from "@repo/shared"

import { getAdminUserDetailFn, listAdminUsersFn } from "@/server/admin"

export const adminKeys = {
  all: ["admin"] as const,
  usersPages: () => [...adminKeys.all, "users"] as const,
  // q normalized here so loader- and hook-built keys match.
  usersPage: (input: AdminUsersPageInput) =>
    [
      ...adminKeys.usersPages(),
      { page: input.page, q: input.q ?? "" },
    ] as const,
  userDetails: () => [...adminKeys.all, "user"] as const,
  userDetail: (userId: string) => [...adminKeys.userDetails(), userId] as const,
}

export function adminUsersPageOptions(input: AdminUsersPageInput) {
  return queryOptions({
    queryKey: adminKeys.usersPage(input),
    queryFn: () => listAdminUsersFn({ data: input }),
    staleTime: 5_000,
  })
}

export function adminUserDetailOptions(userId: string) {
  return queryOptions({
    queryKey: adminKeys.userDetail(userId),
    queryFn: () => getAdminUserDetailFn({ data: { userId } }),
    staleTime: 5_000,
  })
}
