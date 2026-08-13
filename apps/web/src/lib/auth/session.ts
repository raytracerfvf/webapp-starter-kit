import { createServerFn } from "@tanstack/react-start"

import { serverEnv } from "../env/server"
import { readServerSession } from "./session.server"

export type { Session, User } from "./client"

export interface SocialProviderAvailability {
  google: boolean
  github: boolean
}

// One RPC for everything the client bootstrap needs; socialProviders is
// boot-static server config, so it rides along instead of owning a second fn.
export const getSessionContextFn = createServerFn({ method: "GET" }).handler(
  async () => ({
    session: await readServerSession(),
    socialProviders: {
      google: Boolean(
        serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET,
      ),
      github: Boolean(
        serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET,
      ),
    },
  }),
)
