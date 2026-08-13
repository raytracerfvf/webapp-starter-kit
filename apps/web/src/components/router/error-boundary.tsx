import type { ErrorComponentProps } from "@tanstack/react-router"
import { useRouter } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { m } from "@/i18n"
import { useResetQueryErrorsOnMount } from "@/lib/hooks/use-query-error-reset"

export function DefaultErrorComponent({ reset }: ErrorComponentProps) {
  const router = useRouter()
  useResetQueryErrorsOnMount()

  return (
    <main className="mx-auto max-w-xl px-4 py-24">
      <Card>
        <h1 className="t-title">{m.router_error_title()}</h1>
        <p className="mt-3 text-muted-foreground">
          {m.router_error_description()}
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          {m.common_try_again()}
        </Button>
      </Card>
    </main>
  )
}
