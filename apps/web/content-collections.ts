import { defineCollection, defineConfig } from "@content-collections/core"
import { compileMDX } from "@content-collections/mdx"
import GithubSlugger from "github-slugger"
import rehypeSlug from "rehype-slug"
import { z } from "zod"

// Same slugger as rehype-slug, so the sidebar ids always match the rendered
// heading ids.
export function extractHeadings(source: string) {
  const slugger = new GithubSlugger()
  return [...source.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((match) => ({
    depth: match[1]?.length ?? 2,
    title: match[2] ?? "",
    id: slugger.slug(match[2] ?? ""),
  }))
}

const schema = z.object({
  title: z.string(),
  description: z.string(),
  published: z.boolean().default(true),
  content: z.string(),
})

const docs = defineCollection({
  name: "docs",
  directory: "content/docs",
  include: "**/*.mdx",
  schema,
  transform: async (document, context) => ({
    ...document,
    locale: document._meta.path.split("/")[0] ?? "en",
    slug: document._meta.path.replace(/^[^/]+\//, "").replace(/\.mdx$/, ""),
    headings: extractHeadings(document.content),
    mdx: await compileMDX(context, document, { rehypePlugins: [rehypeSlug] }),
  }),
})

const pages = defineCollection({
  name: "pages",
  directory: "content/pages",
  include: "**/*.mdx",
  schema,
  transform: async (document, context) => ({
    ...document,
    locale: document._meta.path.split("/")[0] ?? "en",
    slug: document._meta.path.replace(/^[^/]+\//, "").replace(/\.mdx$/, ""),
    mdx: await compileMDX(context, document),
  }),
})

export default defineConfig({ content: [docs, pages] })
