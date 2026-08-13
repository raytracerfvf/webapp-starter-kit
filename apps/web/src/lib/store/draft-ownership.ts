// Drafts outlive the session that wrote them: an anonymous one is adopted by
// the first account to sign in, and a different account's are wiped.

const DRAFT_OWNER_KEY = "webapp:draft-owner"
const DRAFT_KEY_PREFIX = "webapp:note-editor:"

export function clearAllNoteDrafts(storage: Storage) {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(DRAFT_KEY_PREFIX)) keys.push(key)
  }
  // Collected first: removing while iterating shifts the key indices.
  for (const key of keys) storage.removeItem(key)
  storage.removeItem(DRAFT_OWNER_KEY)
}

export function reconcileDraftOwner(storage: Storage, userId: string | null) {
  // A signed-out visit continues the anonymous session.
  if (userId === null) return
  const previous = storage.getItem(DRAFT_OWNER_KEY)
  if (previous === userId) return
  // A different account on this browser must not inherit another's drafts.
  if (previous !== null) clearAllNoteDrafts(storage)
  storage.setItem(DRAFT_OWNER_KEY, userId)
}
