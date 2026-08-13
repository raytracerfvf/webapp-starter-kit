---
name: content-i18n
description: Add or revise localized UI copy, Paraglide messages, locale behavior, content-collections and MDX, and localized SEO metadata. Use for user-visible copy, translations, or long-form content pages.
user-invocable: false
---

# Content and internationalization

## Choose the source

- UI labels and parameterized sentences → Paraglide messages.
- Structured multi-paragraph editorial content → content-collections and MDX.
- Long-form prose never goes in a flat message catalog: it loses structure and produces unreviewable diffs.
- Never duplicate slug or locale in frontmatter when the path already derives it.

## Messages

- Application code imports generated message functions as `m` from `@/i18n` and never reads locale JSON
  directly. All user-visible copy goes through `m.*` — no hardcoded strings in components.
- Paraglide owns locale-prefixed URLs and persists explicit choices in `PARAGLIDE_LOCALE`. The request
  middleware in `apps/web/src/lib/middleware/paraglide.ts` provides request-scoped SSR locale isolation.
- Locale changes go through Paraglide's `setLocale`, which performs a document navigation so the URL, SSR
  output, `<html lang>`/`dir`, and hydrated UI stay in sync.
- One parameterized message per grammatical sentence. Never concatenate fragments whose order changes across
  languages.
- When a sentence contains a link or component, use structured message parts only if the translation model can
  preserve grammar; otherwise render a rich-message abstraction rather than English-order concatenation.
- Keys describe meaning and context, not the current English text.
- Dates, numbers, pluralization, and relative time use locale-aware formatting.
- Catalogs and content compile via `pnpm codegen`; the outputs (`apps/web/i18n/paraglide/`,
  `apps/web/.content-collections/`) are generated and never hand-edited *(enforced: write-guard hook)*.

## Content collections

- Define a Zod schema for each collection's frontmatter.
- Resolve collections through `apps/web/src/lib/content/localized-content.ts`, passing requested and fallback
  locales explicitly.
- Extract headings deterministically for TOC and anchors; test duplicate and non-Latin headings.
- MDX components are an allowlisted rendering boundary — never expose privileged components or arbitrary server
  imports to content.

## Routing and SEO

- The locale is explicit in route and content resolution and in canonical/alternate metadata
  (`apps/web/src/lib/seo/`).
- Missing-translation behavior is a deliberate choice per content class: fallback, not-found, or build failure.
- Sitemap and metadata include only publishable, indexable localized pages.

## Required checks

- Code generation is deterministic and drift-free.
- Every locale has the required high-value messages and content.
- Exercise long strings, plural forms, and dates/numbers; exercise RTL layout when an RTL locale is added.
- Content schema rejects invalid frontmatter and duplicate slugs.

Refs: `apps/web/i18n/` · `apps/web/content/` · `apps/web/content-collections.ts` ·
`apps/web/src/lib/content/` · `apps/web/src/lib/seo/`.
