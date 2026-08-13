import { MDXContent } from "@content-collections/mdx/react"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { allDocs } from "content-collections"

import { baseLocale, getLocale, m } from "@/i18n"
import { resolveLocalizedContent } from "@/lib/content/localized-content"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export const Route = createFileRoute("/docs/")({ component: DocsPage })

function DocsPage() {
  const document = resolveLocalizedContent(allDocs, {
    locale: getLocale(),
    slug: "getting-started",
    fallbackLocale: baseLocale,
  })
  if (!document) throw notFound()

  return (
    <main
      className={cn(
        pageWidth,
        "grid gap-12 py-16 lg:grid-cols-[13rem_minmax(0,1fr)]",
      )}
    >
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {m.docs_on_this_page()}
        </p>
        <nav className="mt-4 flex flex-col gap-2">
          {document.headings.map((heading) => (
            <a
              key={heading.id}
              className="text-sm hover:text-primary"
              href={`#${heading.id}`}
            >
              {heading.title}
            </a>
          ))}
        </nav>
      </aside>
      <article className="content-prose">
        <p className="text-sm font-semibold text-primary">
          {m.docs_starter_guide()}
        </p>
        <h1 className="t-display mt-3">{document.title}</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          {document.description}
        </p>
        {/* Heading ids come from rehype-slug at compile time. */}
        <MDXContent code={document.mdx} />
      </article>
    </main>
  )
}
