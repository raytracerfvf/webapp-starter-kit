import { z } from "zod"

import { ADMIN_USERS_SEARCH_MAX_LENGTH } from "@repo/shared"

export const NoteSaveIntent = {
  SAVE: "save",
} as const
export type NoteSaveIntent =
  (typeof NoteSaveIntent)[keyof typeof NoteSaveIntent]

// The pending-save marker lives in the URL so it survives the sign-in
// round-trip (OAuth redirect or magic link) without any stashed client state.
export const NewNoteSearchSchema = z.object({
  // Hand-edited garbage means "no pending save", never an error boundary.
  intent: z.literal(NoteSaveIntent.SAVE).optional().catch(undefined),
})

export const AdminUsersSearchSchema = z.object({
  // Hand-edited garbage means "first page, no filter", never an error boundary.
  page: z.number().int().positive().optional().catch(undefined),
  q: z.string().max(ADMIN_USERS_SEARCH_MAX_LENGTH).optional().catch(undefined),
})

export const HomeSearchSchema = z.object({
  // Hand-edited garbage means "no dialog", never an error boundary.
  signIn: z.boolean().optional().catch(undefined),
  // Same-site path only; browsers normalize "\" to "/", so "/\x" is protocol-relative.
  redirect: z
    .string()
    .regex(/^\/(?![/\\])[^\\]*$/)
    .optional(),
})
