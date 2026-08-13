import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { LogOut, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"

import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { Button } from "@/components/ui/button"
import { getLocale, locales, m, setLocale } from "@/i18n"
import { useAuth } from "@/lib/auth/use-auth"
import { useSignOutMutation } from "@/lib/hooks/use-auth-mutations"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

import { NavigationProgress } from "./navigation-progress"

const localeLabels = {
  en: () => m.language_english(),
  de: () => m.language_german(),
}

export function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const auth = useAuth()
  const navigate = useNavigate()
  const signOut = useSignOutMutation()
  // Route-validated search; the header renders above the matches, so it reads
  // the loose union instead of re-parsing location.search.
  const search = useSearch({ strict: false })
  const signInRequested = !auth.isAuthenticated && search.signIn === true
  const [signInOpen, setSignInOpen] = useState(false)
  const closeRequestedSignIn = (open: boolean) => {
    setSignInOpen(open)
    if (!open && signInRequested)
      void navigate({ to: "/", search: {}, replace: true })
  }
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
        <div
          className={cn(
            pageWidth,
            "flex flex-wrap items-center gap-x-2 gap-y-2 py-2 md:h-16 md:flex-nowrap md:justify-between md:py-0",
          )}
        >
          <Link to="/" className="font-bold tracking-tight">
            {m.app_name()}
          </Link>
          <nav
            className="order-last flex w-full items-center justify-between gap-1 md:order-none md:w-auto md:justify-normal"
            aria-label={m.nav_primary()}
          >
            <Button asChild variant="ghost">
              <Link to="/docs">{m.nav_docs()}</Link>
            </Button>
            {auth.isAuthenticated ? (
              <Button asChild variant="ghost">
                <Link to="/notes">{m.nav_notes()}</Link>
              </Button>
            ) : (
              // Signed-out visitors go straight into the guest editor; the
              // sign-in gate appears only when they save.
              <Button asChild variant="ghost">
                <Link to="/notes/new">{m.nav_notes()}</Link>
              </Button>
            )}
            <label className="sr-only" htmlFor="app-locale">
              {m.language_label()}
            </label>
            <select
              id="app-locale"
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={getLocale()}
              onChange={(event) => {
                const next = locales.find(
                  (locale) => locale === event.target.value,
                )
                if (next) setLocale(next)
              }}
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeLabels[locale]()}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              aria-label={m.theme_toggle()}
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </Button>
            {auth.isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label={m.auth_sign_out()}
                disabled={signOut.isPending}
                onClick={() =>
                  // Navigation is a call-site concern; cache work is the hook's.
                  signOut.mutate(undefined, {
                    onSuccess: () => navigate({ to: "/" }),
                  })
                }
              >
                <LogOut size={18} />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setSignInOpen(true)}>
                {m.auth_sign_in()}
              </Button>
            )}
          </nav>
        </div>
        <NavigationProgress />
      </header>
      <SignInDialog
        open={signInOpen || signInRequested}
        onOpenChange={closeRequestedSignIn}
        socialProviders={auth.socialProviders}
        redirectPath={search.redirect}
      />
    </>
  )
}
