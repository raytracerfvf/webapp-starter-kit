import { APIError } from "better-auth/api"
import { describe, expect, it } from "vitest"

import { ADMIN_BAN_REASON_MAX_LENGTH, UserRole } from "@repo/shared"

import {
  enforceBanUserPolicy,
  enforceSetRolePolicy,
} from "./admin-write-policy"

describe("enforceSetRolePolicy", () => {
  it("normalizes valid roles and always retains the baseline", () => {
    expect(
      enforceSetRolePolicy({ userId: "u2", role: ["admin"] }, "u1"),
    ).toEqual({ userId: "u2", role: [UserRole.USER, UserRole.ADMIN] })
    expect(enforceSetRolePolicy({ userId: "u2", role: "admin" }, "u1")).toEqual(
      { userId: "u2", role: [UserRole.USER, UserRole.ADMIN] },
    )
    expect(enforceSetRolePolicy({ userId: "u2", role: [] }, "u1")).toEqual({
      userId: "u2",
      role: [UserRole.USER],
    })
  })

  it("rejects unknown roles, bad payloads, and self-role-change", () => {
    expect(() =>
      enforceSetRolePolicy({ userId: "u2", role: ["superuser"] }, "u1"),
    ).toThrowError(APIError)
    expect(() => enforceSetRolePolicy({}, "u1")).toThrowError(APIError)
    expect(() =>
      enforceSetRolePolicy({ userId: "u1", role: ["admin"] }, "u1"),
    ).toThrowError(APIError)
  })

  it("strips unknown fields", () => {
    expect(
      enforceSetRolePolicy(
        { userId: "u2", role: ["user"], banned: true },
        "u1",
      ),
    ).not.toHaveProperty("banned")
  })
})

describe("enforceBanUserPolicy", () => {
  it("passes valid payloads through", () => {
    expect(enforceBanUserPolicy({ userId: "u2", banReason: "spam" })).toEqual({
      userId: "u2",
      banReason: "spam",
    })
    expect(enforceBanUserPolicy({ userId: "u2" })).toEqual({ userId: "u2" })
  })

  it("rejects an over-long reason and a missing userId", () => {
    expect(() =>
      enforceBanUserPolicy({
        userId: "u2",
        banReason: "x".repeat(ADMIN_BAN_REASON_MAX_LENGTH + 1),
      }),
    ).toThrowError(APIError)
    expect(() => enforceBanUserPolicy({})).toThrowError(APIError)
  })
})
