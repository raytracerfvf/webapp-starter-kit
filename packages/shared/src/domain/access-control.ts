import { NoteVisibility } from "./enums"

export const AccessLevel = {
  OWNER: "owner",
  READ_ONLY: "read_only",
  NONE: "none",
} as const
export type AccessLevel = (typeof AccessLevel)[keyof typeof AccessLevel]

export function noteAccess(input: {
  ownerId: string
  viewerId: string | null
  visibility: NoteVisibility
}): AccessLevel {
  if (input.viewerId === input.ownerId) return AccessLevel.OWNER
  if (input.visibility === NoteVisibility.UNLISTED) return AccessLevel.READ_ONLY
  return AccessLevel.NONE
}
