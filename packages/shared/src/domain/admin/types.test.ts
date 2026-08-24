import { describe, expect, it } from "vitest"

import { hasRole, parseRoles, serializeRoles, UserRole } from "./types"

describe("parseRoles", () => {
  it.each([
    { label: "null", value: null, expected: [] },
    { label: "undefined", value: undefined, expected: [] },
    { label: "empty input", value: "", expected: [] },
    {
      label: "multiple roles",
      value: "user,admin",
      expected: [UserRole.USER, UserRole.ADMIN],
    },
    {
      label: "surrounding whitespace",
      value: " user , admin ",
      expected: [UserRole.USER, UserRole.ADMIN],
    },
    { label: "an unknown role", value: "administrator", expected: [] },
    {
      label: "unknown roles mixed with known roles",
      value: "user,superuser,admin",
      expected: [UserRole.USER, UserRole.ADMIN],
    },
  ])("decodes $label", ({ value, expected }) => {
    expect(parseRoles(value)).toEqual(expected)
  })
})

describe("serializeRoles", () => {
  it("always retains the baseline and deduplicates", () => {
    expect(serializeRoles([])).toBe("user")
    expect(serializeRoles([UserRole.ADMIN])).toBe("user,admin")
    expect(
      serializeRoles([UserRole.USER, UserRole.ADMIN, UserRole.ADMIN]),
    ).toBe("user,admin")
  })
})

describe("hasRole", () => {
  it("parses the comma-separated multi-role column", () => {
    expect(hasRole({ role: "admin,user" }, UserRole.ADMIN)).toBe(true)
    expect(hasRole({ role: "user,admin" }, UserRole.USER)).toBe(true)
  })

  it("never matches by substring or unknown token", () => {
    expect(hasRole({ role: "administrator" }, UserRole.ADMIN)).toBe(false)
    expect(hasRole({ role: "adm" }, UserRole.ADMIN)).toBe(false)
  })

  it("fails closed for missing users and roles", () => {
    expect(hasRole(null, UserRole.ADMIN)).toBe(false)
    expect(hasRole(undefined, UserRole.ADMIN)).toBe(false)
    expect(hasRole({ role: null }, UserRole.ADMIN)).toBe(false)
    expect(hasRole({}, UserRole.ADMIN)).toBe(false)
  })
})
