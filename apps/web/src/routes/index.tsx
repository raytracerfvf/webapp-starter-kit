import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, Check, Terminal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { m } from "@/i18n"
import { useAuth } from "@/lib/auth/use-auth"
import { HomeSearchSchema } from "@/lib/constants/search"
import { pageWidth } from "@/lib/ui-styles"
import { cn } from "@/lib/utils/cn"

export const Route = createFileRoute("/")({
  validateSearch: HomeSearchSchema,
  component: HomePage,
})

function HomePage() {
  const auth = useAuth()
  return (
    <main>
      <section className={cn(pageWidth, "py-24 sm:py-36")}>
        <p className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-primary">
          {m.home_eyebrow()}
        </p>
        <h1 className="t-display max-w-4xl">
          {m.home_title_first()}
          <br />
          {m.home_title_second()}
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground">
          {m.home_description()}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {auth.isAuthenticated ? (
            <Button asChild size="lg">
              <Link to="/notes">
                {m.home_open_notes()} <ArrowRight size={18} />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/notes/new">
                {m.home_try_notes()} <ArrowRight size={18} />
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="secondary">
            <Link to="/docs">{m.home_read_docs()}</Link>
          </Button>
        </div>
      </section>
      <section className="bg-muted">
        <div className={cn(pageWidth, "py-20 sm:py-24")}>
          <p className="t-eyebrow text-primary">{m.home_features_eyebrow()}</p>
          <h2 className="t-title mt-4 max-w-2xl">{m.home_features_title()}</h2>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            {m.home_features_description()}
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              [m.home_feature_1_title(), m.home_feature_1_description()],
              [m.home_feature_2_title(), m.home_feature_2_description()],
              [m.home_feature_3_title(), m.home_feature_3_description()],
              [m.home_feature_4_title(), m.home_feature_4_description()],
              [m.home_feature_5_title(), m.home_feature_5_description()],
              [m.home_feature_6_title(), m.home_feature_6_description()],
              [m.home_feature_7_title(), m.home_feature_7_description()],
              [m.home_feature_8_title(), m.home_feature_8_description()],
              [m.home_feature_9_title(), m.home_feature_9_description()],
            ].map(([title, description]) => (
              <div className="rounded-lg border p-5" key={title}>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className={cn(pageWidth, "py-20 sm:py-24")}>
        <p className="t-eyebrow text-primary">{m.home_principles_eyebrow()}</p>
        <h2 className="t-title mt-4 max-w-2xl">{m.home_principles_title()}</h2>
        <div className="mt-12 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {[
            [m.home_principle_1_title(), m.home_principle_1_description()],
            [m.home_principle_2_title(), m.home_principle_2_description()],
            [m.home_principle_3_title(), m.home_principle_3_description()],
            [m.home_principle_4_title(), m.home_principle_4_description()],
            [m.home_principle_5_title(), m.home_principle_5_description()],
            [m.home_principle_6_title(), m.home_principle_6_description()],
          ].map(([title, description], index) => (
            <div key={title}>
              <p aria-hidden="true" className="text-sm font-bold text-primary">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-muted">
        <div
          className={cn(
            pageWidth,
            "grid gap-10 py-20 md:grid-cols-2 md:gap-16 sm:py-24",
          )}
        >
          <div>
            <p className="t-eyebrow text-primary">{m.home_setup_eyebrow()}</p>
            <h2 className="t-title mt-4 max-w-xl">{m.home_setup_title()}</h2>
            <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
              {m.home_setup_description()}
            </p>
            <ul
              className="mt-8 space-y-3"
              aria-label={m.home_setup_requirements()}
            >
              <li className="flex items-start gap-3">
                <Check
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                  size={18}
                />
                <span>{m.home_setup_node_requirement()}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                  size={18}
                />
                <span>{m.home_setup_docker_requirement()}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                  size={18}
                />
                <span>{m.home_setup_python_requirement()}</span>
              </li>
            </ul>
          </div>
          <Card
            className="overflow-hidden p-0"
            aria-label={m.home_setup_terminal_label()}
          >
            <div className="flex items-center gap-2 border-b px-5 py-4 text-sm font-semibold">
              <Terminal className="text-primary" aria-hidden="true" size={18} />
              {m.home_setup_terminal_label()}
            </div>
            <pre className="overflow-x-auto p-5 text-sm leading-7">
              <code>{m.home_setup_commands()}</code>
            </pre>
          </Card>
        </div>
      </section>
      <section className={cn(pageWidth, "pb-24 sm:pb-36")}>
        <div className="border-t pt-12">
          <h2 className="t-eyebrow text-primary">{m.home_footnotes_label()}</h2>
          <ol className="mt-6 max-w-3xl space-y-4 text-sm leading-6 text-muted-foreground">
            {[
              m.home_footnote_1(),
              m.home_footnote_2(),
              m.home_footnote_3(),
              m.home_footnote_4(),
              m.home_footnote_5(),
            ].map((footnote, index) => (
              <li className="flex items-start gap-3" key={footnote}>
                <span
                  aria-hidden="true"
                  className="shrink-0 font-bold text-primary"
                >
                  {index + 1}
                </span>
                <span>{footnote}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}
