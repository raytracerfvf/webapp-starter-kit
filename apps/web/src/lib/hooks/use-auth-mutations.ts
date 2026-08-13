import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"

import { authClient } from "@/lib/auth/client"
import { resetClientSession } from "@/lib/auth/reset-client-session"
import { clearAllNoteDrafts } from "@/lib/store/draft-ownership"

export type SocialProvider = "google" | "github"

export type SignInInput =
  | { method: "magicLink"; email: string; callbackUrl: string }
  | { method: "social"; provider: SocialProvider; callbackUrl: string }

// One mutation for one user action: the two transports are exclusive, so a
// single pending/error state is the correct model for every caller.
export function useSignInMutation() {
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const result =
        input.method === "magicLink"
          ? await authClient.signIn.magicLink({
              email: input.email,
              callbackURL: input.callbackUrl,
            })
          : await authClient.signIn.social({
              provider: input.provider,
              callbackURL: input.callbackUrl,
            })
      if (result.error) throw new Error("sign-in rejected")
    },
  })
}

export function useSignOutMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut()
      if (result.error) throw new Error("sign-out rejected")
    },
    onSuccess: () => {
      // Only an explicit sign-out clears drafts; session-expiry recovery keeps
      // them, since the same person is still at the keyboard.
      if (typeof window !== "undefined") clearAllNoteDrafts(window.localStorage)
      return resetClientSession(queryClient, () => router.invalidate())
    },
  })
}
