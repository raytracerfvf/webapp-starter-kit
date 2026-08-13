import { describe, expect, expectTypeOf, it } from "vitest"

import { ServerEnvSchema } from "./schema"

const minimumEnvironment = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/webapp",
  BETTER_AUTH_SECRET: "a-secure-test-secret-with-at-least-32-characters",
}

describe("ServerEnvSchema", () => {
  it("supports the documented minimum local environment", () => {
    const environment = ServerEnvSchema.parse(minimumEnvironment)

    expect(environment.BETTER_AUTH_URL).toBe("http://localhost:3000")
    expect(environment.EMAIL_MODE).toBe("log")
    expectTypeOf(environment.BETTER_AUTH_URL).toEqualTypeOf<string>()
  })

  it("requires an explicit HTTP origin in production", () => {
    expect(
      ServerEnvSchema.safeParse({
        ...minimumEnvironment,
        NODE_ENV: "production",
      }).success,
    ).toBe(false)
    expect(
      ServerEnvSchema.safeParse({
        ...minimumEnvironment,
        NODE_ENV: "production",
        BETTER_AUTH_URL: "https://example.com/path",
      }).success,
    ).toBe(false)
  })

  it("accepts only PostgreSQL URLs with a database name", () => {
    expect(
      ServerEnvSchema.safeParse({
        ...minimumEnvironment,
        DATABASE_URL: "https://example.com/webapp",
      }).success,
    ).toBe(false)
    expect(
      ServerEnvSchema.safeParse({
        ...minimumEnvironment,
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432",
      }).success,
    ).toBe(false)
  })

  it("requires complete OAuth credential pairs", () => {
    expect(
      ServerEnvSchema.safeParse({
        ...minimumEnvironment,
        GOOGLE_CLIENT_ID: "google-client",
      }).success,
    ).toBe(false)
    expect(
      ServerEnvSchema.safeParse({
        ...minimumEnvironment,
        GITHUB_CLIENT_ID: " github-client",
        GITHUB_CLIENT_SECRET: "github-secret",
      }).success,
    ).toBe(false)
  })

  it("requires a Resend key only in resend mode", () => {
    expect(
      ServerEnvSchema.safeParse({
        ...minimumEnvironment,
        EMAIL_MODE: "resend",
      }).success,
    ).toBe(false)
    expect(
      ServerEnvSchema.safeParse({
        ...minimumEnvironment,
        EMAIL_MODE: "resend",
        RESEND_API_KEY: "re_test_key",
      }).success,
    ).toBe(true)
  })
})
