import { useMutation, useQueryClient } from "@tanstack/react-query"

import { normalizeRoles, type UserRole } from "@repo/shared"

import { authClient } from "@/lib/auth/client"
import { adminKeys } from "@/lib/queries/admin"

// Better Auth's client returns { error } instead of throwing.
function throwOnError(error: { message?: string | undefined } | null) {
  if (error) {
    throw new Error(error.message ?? "")
  }
}

function useInvalidateAdminUser() {
  const queryClient = useQueryClient()
  return (userId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.usersPages() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(userId) }),
    ])
}

export function useSetUserRoleMutation() {
  const invalidate = useInvalidateAdminUser()
  return useMutation({
    mutationFn: async (vars: { userId: string; roles: UserRole[] }) => {
      const { error } = await authClient.admin.setRole({
        userId: vars.userId,
        role: normalizeRoles(vars.roles),
      })
      throwOnError(error)
    },
    onSuccess: (_data, vars) => invalidate(vars.userId),
  })
}

export function useBanUserMutation() {
  const invalidate = useInvalidateAdminUser()
  return useMutation({
    mutationFn: async (vars: {
      userId: string
      reason?: string | undefined
    }) => {
      // Issued cookies can outlive a ban by the 5-minute cookieCache window.
      const { error } = await authClient.admin.banUser({
        userId: vars.userId,
        ...(vars.reason ? { banReason: vars.reason } : {}),
      })
      throwOnError(error)
    },
    onSuccess: (_data, vars) => invalidate(vars.userId),
  })
}

export function useUnbanUserMutation() {
  const invalidate = useInvalidateAdminUser()
  return useMutation({
    mutationFn: async (vars: { userId: string }) => {
      const { error } = await authClient.admin.unbanUser(vars)
      throwOnError(error)
    },
    onSuccess: (_data, vars) => invalidate(vars.userId),
  })
}

export function useImpersonateUserMutation() {
  return useMutation({
    mutationFn: async (vars: { userId: string }) => {
      const { error } = await authClient.admin.impersonateUser(vars)
      throwOnError(error)
    },
    // Full reload, not resetClientSession: the identity swap must rebuild
    // root context and client state from a clean document.
    onSuccess: () => {
      window.location.href = "/"
    },
  })
}

export function useStopImpersonatingMutation() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.admin.stopImpersonating()
      throwOnError(error)
    },
    onSuccess: () => {
      window.location.href = "/"
    },
  })
}
