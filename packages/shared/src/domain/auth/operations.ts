import { lt } from "drizzle-orm"

import type { DrizzleExecutor } from "../../db/client"
import { session, verification } from "../../db/schema/auth.gen"

export async function deleteExpiredAuthRecords(
  db: DrizzleExecutor,
  now = new Date(),
) {
  // returning() instead of rowCount: DrizzleExecutor is driver-agnostic.
  const sessions = await db
    .delete(session)
    .where(lt(session.expiresAt, now))
    .returning({ id: session.id })
  const verifications = await db
    .delete(verification)
    .where(lt(verification.expiresAt, now))
    .returning({ id: verification.id })
  return {
    sessions: sessions.length,
    verifications: verifications.length,
  }
}
