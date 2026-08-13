import { createFileRoute } from "@tanstack/react-router"

import { locales, localizeUrl } from "@/i18n"
import { SITE_ORIGIN } from "@/lib/seo/config"
import { sitemapXml } from "@/lib/seo/routes"

const localizedPaths = ["/", "/docs"].flatMap((path) =>
  locales.map(
    (locale) => localizeUrl(new URL(path, SITE_ORIGIN), { locale }).pathname,
  ),
)

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(sitemapXml(localizedPaths), {
          headers: { "content-type": "application/xml; charset=utf-8" },
        }),
    },
  },
})
