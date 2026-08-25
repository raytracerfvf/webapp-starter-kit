import { Link, useParams } from "@tanstack/react-router"
import { useState } from "react"

import {
  ADMIN_BAN_REASON_MAX_LENGTH,
  ASSIGNABLE_ROLES,
  type UserRole,
} from "@repo/shared"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { m } from "@/i18n"
import { useAuth } from "@/lib/auth/use-auth"
import {
  useBanUserMutation,
  useImpersonateUserMutation,
  useSetUserRoleMutation,
  useUnbanUserMutation,
} from "@/lib/hooks/use-admin-mutations"
import { useAdminUserDetailQuery } from "@/lib/hooks/use-admin-queries"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"
import { formatDateTime } from "@/lib/utils/format-date"

const roleLabels: Record<UserRole, () => string> = {
  user: () => m.admin_role_user_label(),
  admin: () => m.admin_role_admin_badge(),
}

export function AdminUserDetailPage() {
  const { userId } = useParams({ from: "/_authenticated/admin/$userId" })
  const detail = useAdminUserDetailQuery(userId).data
  const auth = useAuth()
  const isSelf = detail.id === auth.user?.id
  const setRole = useSetUserRoleMutation()
  const ban = useBanUserMutation()
  const unban = useUnbanUserMutation()
  const impersonate = useImpersonateUserMutation()
  const [banOpen, setBanOpen] = useState(false)
  const [banReason, setBanReason] = useState("")

  return (
    <main className={cn(pageWidth, "py-16")}>
      <section className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin">{m.admin_back_to_users()}</Link>
        </Button>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="t-display">{detail.name}</h1>
            <p className="text-muted-foreground">{detail.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>
              {detail.emailVerified
                ? m.admin_email_verified()
                : m.admin_email_unverified()}
            </Badge>
            {detail.banned ? (
              <Badge className="bg-destructive text-destructive-foreground">
                {m.admin_banned_badge()}
              </Badge>
            ) : null}
          </div>
        </div>

        <Card className="mt-8">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{m.admin_signed_up()}</dt>
              <dd>{formatDateTime(detail.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{m.admin_updated()}</dt>
              <dd>{formatDateTime(detail.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{m.admin_notes_count()}</dt>
              <dd>{detail.notesCount}</dd>
            </div>
          </dl>
        </Card>

        <Card className="mt-4">
          <h2 className="font-bold">{m.admin_role_section_title()}</h2>
          {isSelf ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {m.admin_self_note()}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3">
            {ASSIGNABLE_ROLES.map((role) => (
              <div key={role} className="flex items-center justify-between">
                <Label htmlFor={`role-${role}`}>{roleLabels[role]()}</Label>
                <Switch
                  id={`role-${role}`}
                  checked={detail.roles.includes(role)}
                  disabled={isSelf || setRole.isPending}
                  onCheckedChange={(checked) =>
                    setRole.mutate({
                      userId: detail.id,
                      roles: checked
                        ? [...detail.roles, role]
                        : detail.roles.filter((r) => r !== role),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-4">
          <h2 className="font-bold">{m.admin_access_section_title()}</h2>
          {detail.banned && detail.banReason ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {m.admin_ban_reason_display({ reason: detail.banReason })}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.banned ? (
              <Button
                variant="secondary"
                disabled={unban.isPending}
                onClick={() => unban.mutate({ userId: detail.id })}
              >
                {m.admin_unban_action()}
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={isSelf}
                onClick={() => setBanOpen(true)}
              >
                {m.admin_ban_action()}
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={isSelf || impersonate.isPending}
              onClick={() => impersonate.mutate({ userId: detail.id })}
            >
              {m.admin_impersonate_action()}
            </Button>
          </div>
        </Card>
      </section>

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogTitle>
            {m.admin_ban_dialog_title({ email: detail.email })}
          </DialogTitle>
          <DialogDescription>
            {m.admin_ban_dialog_description()}
          </DialogDescription>
          <div className="mt-2 grid gap-2">
            <Label htmlFor="ban-reason">{m.admin_ban_reason_label()}</Label>
            <Textarea
              id="ban-reason"
              value={banReason}
              maxLength={ADMIN_BAN_REASON_MAX_LENGTH}
              onChange={(event) => setBanReason(event.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBanOpen(false)}>
              {m.admin_cancel_action()}
            </Button>
            <Button
              variant="destructive"
              disabled={ban.isPending}
              onClick={() =>
                ban.mutate(
                  {
                    userId: detail.id,
                    reason: banReason.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      setBanOpen(false)
                      setBanReason("")
                    },
                  },
                )
              }
            >
              {m.admin_ban_confirm_action()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
