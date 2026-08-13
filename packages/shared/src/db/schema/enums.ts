import { pgEnum } from "drizzle-orm/pg-core"

import { NOTE_VISIBILITIES } from "../../domain/enums"

export const noteVisibilityEnum = pgEnum("note_visibility", NOTE_VISIBILITIES)
