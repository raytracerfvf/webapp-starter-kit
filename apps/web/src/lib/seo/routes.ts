import { IS_INDEXABLE, SITE_ORIGIN } from "./config"

export function robotsText() {
  return IS_INDEXABLE
    ? `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n"
}

export function sitemapXml(paths: readonly string[]) {
  const urls = paths
    .map(
      (path) =>
        `<url><loc>${new URL(path, SITE_ORIGIN).toString()}</loc></url>`,
    )
    .join("")
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}
