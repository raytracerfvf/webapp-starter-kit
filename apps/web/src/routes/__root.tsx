import { TanStackDevtools } from "@tanstack/react-devtools"
import type { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

import { Header } from "@/components/layout/header"
import { ThemeProvider } from "@/components/router/theme-provider"
import { getLocale, getTextDirection, m } from "@/i18n"
import type {
  Session,
  SocialProviderAvailability,
  User,
} from "@/lib/auth/session"
import { sessionQueryOptions } from "@/lib/auth/session-query"
import { reconcileDraftOwner } from "@/lib/store/draft-ownership"

import styles from "../styles.css?url"

export interface RouterContext {
  queryClient: QueryClient
  auth: {
    user: User | null
    session: Session | null
    isAuthenticated: boolean
    socialProviders: SocialProviderAvailability
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    const { session, socialProviders } = await context.queryClient.fetchQuery(
      sessionQueryOptions(),
    )
    // Settles before any route component mounts, so no store can load a draft
    // this would have wiped.
    if (typeof window !== "undefined")
      reconcileDraftOwner(window.localStorage, session?.user.id ?? null)
    return {
      auth: {
        user: session?.user ?? null,
        session: session?.session ?? null,
        isAuthenticated: Boolean(session?.user && session?.session),
        socialProviders,
      },
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: m.app_name() },
      {
        name: "description",
        content: m.site_description(),
      },
    ],
    links: [{ rel: "stylesheet", href: styles }],
  }),
  // Since @tanstack/react-router 1.170.19 an inherited defaultPendingComponent
  // wraps the root match — including <html> — in a Suspense boundary React
  // cannot hydrate, so every SSR document was discarded and re-rendered on the
  // client (TanStack/router#8053). The root renders the document shell and must
  // never suspend; child routes keep their own pending boundaries.
  wrapInSuspense: false,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Header />
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} dir={getTextDirection()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[
              { name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
