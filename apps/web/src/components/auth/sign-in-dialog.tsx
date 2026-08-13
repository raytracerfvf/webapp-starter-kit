import { Mail } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { localizeHref, m } from "@/i18n"
import type { SocialProviderAvailability } from "@/lib/auth/session"
import {
  type SocialProvider,
  useSignInMutation,
} from "@/lib/hooks/use-auth-mutations"

export function SignInDialog({
  open,
  onOpenChange,
  socialProviders,
  redirectPath,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  socialProviders: SocialProviderAvailability
  redirectPath?: string | undefined
}) {
  const [email, setEmail] = useState("")
  const hasSocialProvider = socialProviders.google || socialProviders.github
  // redirectPath arrives de-localized from the router rewrite.
  const callbackUrl = localizeHref(redirectPath ?? "/notes")

  const signIn = useSignInMutation()
  const sent = signIn.isSuccess && signIn.variables?.method === "magicLink"
  const connecting = (provider: SocialProvider) =>
    signIn.isPending &&
    signIn.variables?.method === "social" &&
    signIn.variables.provider === provider
  const error = signIn.isError
    ? signIn.variables?.method === "social"
      ? m.auth_social_error({ provider: signIn.variables.provider })
      : m.auth_email_error()
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          {sent ? m.auth_check_inbox() : m.auth_sign_in()}
        </DialogTitle>
        <DialogDescription>
          {sent
            ? m.auth_link_sent()
            : hasSocialProvider
              ? m.auth_social_description()
              : m.auth_email_description()}
        </DialogDescription>
        {sent ? (
          <p className="mt-6 rounded-md bg-muted p-4 text-sm">
            {m.auth_close_after_opening()}
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {socialProviders.google ? (
              <Button
                type="button"
                variant="secondary"
                disabled={signIn.isPending}
                onClick={() =>
                  signIn.mutate({
                    method: "social",
                    provider: "google",
                    callbackUrl,
                  })
                }
              >
                <GoogleMark />
                {connecting("google")
                  ? m.auth_connecting()
                  : m.auth_continue_with_provider({ provider: "Google" })}
              </Button>
            ) : null}
            {socialProviders.github ? (
              <Button
                type="button"
                variant="secondary"
                disabled={signIn.isPending}
                onClick={() =>
                  signIn.mutate({
                    method: "social",
                    provider: "github",
                    callbackUrl,
                  })
                }
              >
                <GitHubMark />
                {connecting("github")
                  ? m.auth_connecting()
                  : m.auth_continue_with_provider({ provider: "GitHub" })}
              </Button>
            ) : null}
            {hasSocialProvider ? (
              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {m.auth_or()}
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                signIn.mutate({
                  method: "magicLink",
                  email: email.trim(),
                  callbackUrl,
                })
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="sign-in-email">{m.auth_email_address()}</Label>
                <Input
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <Button type="submit" disabled={signIn.isPending}>
                <Mail size={17} />
                {signIn.isPending && signIn.variables?.method === "magicLink"
                  ? m.auth_sending()
                  : m.auth_email_link_action()}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
      <path
        d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.598-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22z"
        fill="#34A853"
      />
      <path
        d="M6.402 13.9a6.005 6.005 0 0 1 0-3.8V7.51H3.064a10.003 10.003 0 0 0 0 8.98l3.338-2.59z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.977c1.468 0 2.786.504 3.823 1.495l2.868-2.868C16.96 2.991 14.695 2 12 2A9.996 9.996 0 0 0 3.064 7.51L6.402 10.1C7.19 7.737 9.395 5.977 12 5.977z"
        fill="#EA4335"
      />
    </svg>
  )
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
      <path
        fill="currentColor"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.014-1.699-2.782.604-3.369-1.342-3.369-1.342-.455-1.157-1.11-1.465-1.11-1.465-.908-.62.069-.608.069-.608 1.003.071 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.091-.646.349-1.087.635-1.337-2.221-.253-4.555-1.111-4.555-4.943 0-1.092.39-1.985 1.029-2.684-.103-.253-.446-1.27.098-2.646 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.748-1.025 2.748-1.025.546 1.376.203 2.393.1 2.646.64.699 1.028 1.592 1.028 2.684 0 3.841-2.337 4.687-4.565 4.935.359.309.679.92.679 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10Z"
      />
    </svg>
  )
}
