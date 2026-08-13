export interface LocalizedContentIdentity {
  locale: string
  slug: string
}

export function resolveLocalizedContent<T extends LocalizedContentIdentity>(
  content: readonly T[],
  input: { locale: string; slug: string; fallbackLocale: string },
) {
  return (
    content.find(
      (item) => item.locale === input.locale && item.slug === input.slug,
    ) ??
    content.find(
      (item) =>
        item.locale === input.fallbackLocale && item.slug === input.slug,
    )
  )
}
