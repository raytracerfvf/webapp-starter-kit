import { m } from "@/i18n"
import { useAuth } from "@/lib/auth/use-auth"
import { useStopImpersonatingMutation } from "@/lib/hooks/use-admin-mutations"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

import { Button } from "../ui/button"

export function ImpersonationBanner() {
  const auth = useAuth()
  const stop = useStopImpersonatingMutation()
  if (!auth.session?.impersonatedBy || !auth.user) return null
  return (
    <div className="border-b bg-primary text-primary-foreground">
      <div
        className={cn(
          pageWidth,
          "flex items-center justify-between gap-4 py-2",
        )}
      >
        <p className="text-sm font-semibold">
          {m.admin_impersonating_banner({ email: auth.user.email })}
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled={stop.isPending}
          onClick={() => stop.mutate()}
        >
          {m.admin_impersonating_stop()}
        </Button>
      </div>
    </div>
  )
}
