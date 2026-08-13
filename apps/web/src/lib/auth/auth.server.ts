import "@tanstack/react-start/server-only"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins/magic-link"
import { tanstackStartCookies } from "better-auth/tanstack-start"

import { db } from "../db.server"
import { mailer } from "../email/mailer.server"
import { serverEnv } from "../env/server"
import { getRequestLogger } from "../middleware/request-context.server"

const socialProviders = {
  ...(serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: serverEnv.GOOGLE_CLIENT_ID,
          clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: serverEnv.GITHUB_CLIENT_ID,
          clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
}

export const auth = betterAuth({
  appName: "Webapp Starter Kit",
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg" }),
  experimental: { joins: true },
  emailAndPassword: { enabled: false },
  socialProviders,
  account: {
    accountLinking: {
      enabled: true,
      // Deliberately omit trustedProviders: bypassing provider email verification could enable account takeover.
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "compact" },
  },
  advanced: {
    useSecureCookies: serverEnv.NODE_ENV === "production",
    cookiePrefix: "webapp",
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/magic-link": { window: 60, max: 3 },
      "/magic-link/verify": { window: 60, max: 5 },
      "/sign-in/social": { window: 60, max: 10 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await mailer.sendWelcome(user.email)
          } catch (error) {
            getRequestLogger().error(
              { userId: user.id, error },
              "[auth.welcome] failed",
            )
          }
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 10 * 60,
      sendMagicLink: ({ email, url }) => mailer.sendMagicLink(email, url),
    }),
    tanstackStartCookies(),
  ],
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
})
