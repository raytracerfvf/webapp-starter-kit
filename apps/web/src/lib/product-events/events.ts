export const ProductEvent = {
  PAGE_VIEWED: "page_viewed",
  NOTE_CREATED: "note_created",
  NOTE_SAVED: "note_saved",
} as const
export type ProductEvent = (typeof ProductEvent)[keyof typeof ProductEvent]
