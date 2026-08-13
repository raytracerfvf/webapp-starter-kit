import { describe, expect, it } from "vitest"

import { resolveLocalizedContent } from "./localized-content"

const content = [
  { locale: "en", slug: "guide", title: "Guide" },
  { locale: "de", slug: "guide", title: "Leitfaden" },
]

describe("resolveLocalizedContent", () => {
  it("prefers the requested locale", () => {
    expect(
      resolveLocalizedContent(content, {
        locale: "de",
        slug: "guide",
        fallbackLocale: "en",
      })?.title,
    ).toBe("Leitfaden")
  })

  it("falls back explicitly and returns undefined for an unknown slug", () => {
    expect(
      resolveLocalizedContent(content, {
        locale: "fr",
        slug: "guide",
        fallbackLocale: "en",
      })?.title,
    ).toBe("Guide")
    expect(
      resolveLocalizedContent(content, {
        locale: "de",
        slug: "missing",
        fallbackLocale: "en",
      }),
    ).toBeUndefined()
  })
})
