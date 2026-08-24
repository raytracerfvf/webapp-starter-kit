// First-admin bootstrap: sign in once, then `pnpm admin:promote <email>`.
import { createDb } from "../src/db/client"
import { grantAdminRoleByEmail } from "../src/domain/admin/operations"

const email = process.argv[2]?.trim()
if (!email) {
  console.error("Usage: pnpm admin:promote <email>")
  process.exit(1)
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")

const db = createDb(process.env.DATABASE_URL)
try {
  const promoted = await grantAdminRoleByEmail(db, email)
  if (promoted) {
    console.log(
      `Promoted ${promoted.email} (${promoted.id}) to admin. ` +
        "The role appears after the next sign-in or within 5 minutes.",
    )
  } else {
    console.error(`No user with email ${email} — sign in once first.`)
    process.exitCode = 1
  }
} finally {
  await db.$client.end()
}
