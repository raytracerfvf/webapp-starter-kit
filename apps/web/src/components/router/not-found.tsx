import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { m } from "@/i18n"

export function DefaultNotFoundComponent() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="t-display mt-3">{m.router_not_found_title()}</h1>
        <Button asChild className="mt-8">
          <Link to="/">{m.router_go_home()}</Link>
        </Button>
      </div>
    </main>
  )
}
