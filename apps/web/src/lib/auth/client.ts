import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [magicLinkClient()],
})

export type Session = typeof authClient.$Infer.Session.session
export type User = typeof authClient.$Infer.Session.user
