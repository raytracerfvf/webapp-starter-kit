import { getLocale } from "@/i18n"

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(options: Intl.DateTimeFormatOptions, key: string) {
  const locale = getLocale()
  const cacheKey = `${locale}:${key}`
  let formatter = formatters.get(cacheKey)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    formatters.set(cacheKey, formatter)
  }
  return formatter
}

export function formatDate(date: Date): string {
  return formatterFor({ dateStyle: "medium" }, "date").format(date)
}

export function formatDateTime(date: Date): string {
  return formatterFor(
    { dateStyle: "medium", timeStyle: "short" },
    "datetime",
  ).format(date)
}
