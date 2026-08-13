---
name: design
description: Style and review UI with the repository's design tokens, Tailwind theme, shadcn-derived primitives, cva variants, dark mode, responsive layout, forms, and accessibility rules. Use before styling components, adding tokens or primitives, building forms or dialogs, or auditing design-system usage.
user-invocable: false
---

# Design system

Code is the source of truth — read `apps/web/src/styles.css`, `apps/web/src/lib/ui-styles.ts`, and
`apps/web/src/components/ui/` before changing any of them.

## Tokens

- `styles.css` is the only token source: raw oklch values in `:root` and `.dark`, semantic mapping in
  `@theme inline`. Tailwind v4 CSS-first — no `tailwind.config.*`, no PostCSS.
- Name tokens by intent (`primary`, `muted`, `surface-1`), never by appearance.
- The palette is deliberately smaller than stock shadcn (no `secondary`, `accent`, `popover`, `input`, `ring`).
  Map pasted code onto existing tokens; add one only for a genuinely new intent.
- Spacing and breakpoints stay Tailwind defaults. New type styles are `@utility` entries, not `text-[...]`.
- The body font is self-hosted via `@fontsource-variable/inter` imported in `styles.css`; the stack lives in the
  `--font-sans` theme token. To change fonts, swap that import and token — nothing else.
- A new token is defined in both `:root` and `.dark` and mapped in `@theme inline`. A new utility namespace also
  registers a tailwind-merge class group in `lib/utils/cn.ts` (see the `surface-*` shadows there).
- `styles.css` is excluded from Biome and the write hook, so edits there get no tooling feedback — review
  light/dark token pairs by hand.
- No hardcoded hex or oklch, no palette utilities (`bg-blue-500`), and no arbitrary values where a token or
  preset expresses the intent — add the token first. Two exceptions: email templates
  (`lib/email/components/email-layout.tsx`) use inline hex because email clients cannot read CSS variables, so
  update them alongside any brand-affecting token change; and vendor artwork may keep mandated colors while the
  exception stays inside the asset or its owning component.

## Components

- Tiers: `components/ui/` owned primitives → product-agnostic compositions → feature directories for one-off
  UI. Reuse before building.
- Primitives are shadcn-derived but deliberately slimmed and not upstream-tracked — do not use `shadcn diff`.
  `button.tsx` is the reference: cva variants with intent names, `className` merged via `cn`.
- Adding a primitive: check current shadcn guidance and `apps/web/components.json`, then run
  `pnpm dlx shadcn@latest add <name>` from `apps/web/`, one at a time. Inspect the generated diff, slim it,
  preserve `className` merging and the unified `radix-ui` import, and replace undefined theme tokens with
  existing semantic ones.
- A new look for an existing primitive is a new variant, never a forked component.
- Extract repeated styling when it represents the same intent and would otherwise drift. Keep page-local
  composition local; use `ui-styles.ts` or a cva variant for shared intent. Cross-feature reuse promotes a
  component one tier, moving its tests and imports with it.

## Loading visuals

- `Skeleton` when the destination layout is known · `LiquidDots` for indeterminate work without useful geometry
  · the header progress line only for route navigation. Never stack a spinner inside a route skeleton.
- Skeletons use the existing muted token and preserve the major dimensions of what they replace. Add a
  dedicated skeleton token only if muted stops giving adequate contrast in both themes.
- One pending container announces localized loading text; `LiquidDots`, skeleton shapes, and the progress line
  are decorative. Animate only when `prefers-reduced-motion` allows; reduced motion keeps the same layout with
  a static indicator.

## Theming and responsive

- `next-themes` (`components/router/theme-provider.tsx`) is the only writer of `.dark`; the `@custom-variant` in
  `styles.css` drives dark styles. Theme-dependent values reach components only through tokens, never through
  `dark:` overrides of hardcoded values.
- Mobile-first with Tailwind default breakpoints. `md` is the structural breakpoint (nav collapse,
  panel ↔ drawer); document any deviation here first.
- Prefer CSS for visibility switches; add a client gate only for expensive subtrees so SSR stays stable. A JS
  viewport hook, if one is ever added, must `matchMedia` the same breakpoint the CSS uses.
- One content component renders shared content; panel and drawer wrappers own only chrome.

## Forms and interaction

- Zod schemas own validation and the owning domain module exports named constraint constants. Reuse those
  constants in field `min`/`max` attributes; controls may tighten a constraint, never weaken it. Errors
  associate with their field and are announced accessibly.
- Non-text controls (checkbox, switch, select, radio) go through RHF `Controller` or the `ui/` primitives —
  never raw `register` with value coercion. `setValueAs` is silently ignored for checkbox inputs, producing
  boolean values that fail enum resolvers.
- Every form renders an error for each registered field, or a root error fallback. `handleSubmit` swallows
  resolver failures by design, so an unrendered field error is an invisible dead submit button.
- Controls need keyboard behavior, visible focus, labels, and pending state. Dialogs trap and restore focus and
  define escape and outside-click behavior deliberately.
- Never encode meaning in color alone.

Refs: `apps/web/src/styles.css` · `apps/web/src/lib/ui-styles.ts` · `apps/web/src/lib/utils/cn.ts` ·
`apps/web/components.json`.
