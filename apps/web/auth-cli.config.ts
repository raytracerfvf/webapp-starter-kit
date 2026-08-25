// Schema-generation config for the Better Auth CLI (see auth-and-email skill);
// the runtime config imports server-only modules the CLI cannot load. Keep the
// adapter, plugins, and schema-affecting options in sync with auth.server.ts.
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins/admin"
import { magicLink } from "better-auth/plugins/magic-link"
import { tanstackStartCookies } from "better-auth/tanstack-start"

import { DEFAULT_ROLE, UserRole } from "@repo/shared"

export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: "pg" }),
  rateLimit: { enabled: true, storage: "database" },
  plugins: [
    magicLink({ sendMagicLink: async () => undefined }),
    admin({ defaultRole: DEFAULT_ROLE, adminRoles: [UserRole.ADMIN] }),
    tanstackStartCookies(),
  ],
})
