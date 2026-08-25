import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { NoteDetailSkeleton } from "@/components/notes/note-detail-skeleton"
import { NotesPageSkeleton } from "@/components/notes/notes-page-skeleton"
import { LiquidDots } from "@/components/ui/liquid-dots"
import { m } from "@/i18n"

import { DefaultPendingComponent } from "./pending-spinner"

afterEach(cleanup)

describe("route pending states", () => {
  it("announces one localized status around the generic indicator", () => {
    const view = render(<DefaultPendingComponent />)

    const status = screen.getByRole("status")
    expect(status.textContent).toBe(m.common_loading())
    expect(
      view.container.querySelector("svg")?.getAttribute("aria-hidden"),
    ).toBe("true")
  })

  it.each([
    ["notes list", NotesPageSkeleton],
    ["note detail", NoteDetailSkeleton],
  ])("announces one localized status in the %s skeleton", (_, Skeleton) => {
    render(<Skeleton />)
    expect(screen.getByRole("status").textContent).toBe(m.common_loading())
  })
})

describe("LiquidDots", () => {
  it("uses unique filter ids for concurrent indicators", () => {
    const view = render(
      <>
        <LiquidDots size="sm" />
        <LiquidDots size="lg" />
      </>,
    )

    const filters = view.container.querySelectorAll("filter")
    const groups = view.container.querySelectorAll("g")
    const firstId = filters.item(0).getAttribute("id")
    const secondId = filters.item(1).getAttribute("id")

    expect(firstId).toBeTruthy()
    expect(secondId).toBeTruthy()
    expect(firstId).not.toBe(secondId)
    expect(groups.item(0).getAttribute("filter")).toBe(`url(#${firstId})`)
    expect(groups.item(1).getAttribute("filter")).toBe(`url(#${secondId})`)
  })
})
