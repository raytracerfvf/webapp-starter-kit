import { useSuspenseQuery } from "@tanstack/react-query"

import type { AdminUsersPageInput } from "@repo/shared"

import {
  adminUserDetailOptions,
  adminUsersPageOptions,
} from "@/lib/queries/admin"

export const useAdminUsersPageQuery = (input: AdminUsersPageInput) =>
  useSuspenseQuery(adminUsersPageOptions(input))

export const useAdminUserDetailQuery = (userId: string) =>
  useSuspenseQuery(adminUserDetailOptions(userId))
