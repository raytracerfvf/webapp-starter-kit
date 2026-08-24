import { Link, useNavigate, useSearch } from "@tanstack/react-router"

import { UserRole } from "@repo/shared"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { m } from "@/i18n"
import { useAdminUsersPageQuery } from "@/lib/hooks/use-admin-queries"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"
import { formatDate } from "@/lib/utils/format-date"

export function AdminUsersPage() {
  const search = useSearch({ from: "/_authenticated/admin/" })
  const page = search.page ?? 1
  const { items, hasMore } = useAdminUsersPageQuery({
    page,
    q: search.q,
  }).data
  const navigate = useNavigate()

  return (
    <main className={cn(pageWidth, "py-16")}>
      <section>
        <p className="text-sm font-semibold text-primary">
          {m.admin_workspace()}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="t-display">{m.admin_users_title()}</h1>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const query = new FormData(event.currentTarget).get("q")
              const q = typeof query === "string" ? query.trim() : ""
              void navigate({
                to: "/admin",
                search: q ? { q } : {},
                replace: true,
              })
            }}
          >
            <label className="sr-only" htmlFor="admin-user-search">
              {m.admin_search_label()}
            </label>
            <Input
              id="admin-user-search"
              name="q"
              type="search"
              key={search.q ?? ""}
              defaultValue={search.q ?? ""}
              placeholder={m.admin_search_placeholder()}
              className="w-56"
            />
          </form>
        </div>
        <div className="mt-10 grid gap-3">
          {items.length === 0 ? (
            <Card>
              <p className="text-muted-foreground">{m.admin_empty_list()}</p>
            </Card>
          ) : (
            items.map((user) => (
              <Link
                key={user.id}
                to="/admin/$userId"
                params={{ userId: user.id }}
              >
                <Card className="transition-transform hover:-translate-y-0.5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-bold">{user.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.roles.includes(UserRole.ADMIN) ? (
                        <Badge className="bg-primary text-primary-foreground">
                          {m.admin_role_admin_badge()}
                        </Badge>
                      ) : null}
                      {user.banned ? (
                        <Badge className="bg-destructive text-destructive-foreground">
                          {m.admin_banned_badge()}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() =>
              navigate({
                to: "/admin",
                search: { ...search, page: page > 2 ? page - 1 : undefined },
              })
            }
          >
            {m.admin_page_prev()}
          </Button>
          <Button
            variant="ghost"
            disabled={!hasMore}
            onClick={() =>
              navigate({ to: "/admin", search: { ...search, page: page + 1 } })
            }
          >
            {m.admin_page_next()}
          </Button>
        </div>
      </section>
    </main>
  )
}
