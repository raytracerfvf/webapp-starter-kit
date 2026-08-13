import { describe, expect, it } from "vitest"

import { deLocalizeUrl, localizeUrl } from "@/i18n"

import de from "../../../i18n/messages/de.json"
import en from "../../../i18n/messages/en.json"

describe("Paraglide messages", () => {
  it("keeps every supported locale complete", () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort())
  })

  it("round-trips localized routes", () => {
    const localized = localizeUrl("https://example.com/docs", { locale: "de" })
    expect(localized.pathname).toBe("/de/docs")
    expect(deLocalizeUrl(localized).pathname).toBe("/docs")
  })
})
