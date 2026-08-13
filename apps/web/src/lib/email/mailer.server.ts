import "@tanstack/react-start/server-only"

import { createElement } from "react"
import { Resend } from "resend"
import { z } from "zod"

import { m } from "@/i18n"

import { serverEnv } from "../env/server"
import {
  baseLogger,
  getRequestLogger,
} from "../middleware/request-context.server"
import { type RenderedEmail, renderEmail } from "./render.server"
import { MagicLinkEmail } from "./templates/magic-link"
import { WelcomeEmail } from "./templates/welcome"

const trustedOrigin = new URL(serverEnv.BETTER_AUTH_URL).origin

// Module evaluation is boot time, not request time.
if (serverEnv.NODE_ENV === "production" && serverEnv.EMAIL_MODE === "log") {
  baseLogger.warn(
    { deliveryMode: "log" },
    "[email] EMAIL_MODE=log in production: sign-in links are written to log storage; switch to resend or disabled before real users sign in",
  )
}

export function validateTrustedUrl(value: string) {
  const parsed = new URL(value, trustedOrigin)
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.origin !== trustedOrigin
  ) {
    throw new Error("Email URL is not trusted")
  }
  return parsed.toString()
}

async function deliver(recipient: string, email: RenderedEmail, link?: string) {
  const to = z.email().parse(recipient.trim().toLowerCase())
  if (serverEnv.EMAIL_MODE === "disabled") {
    getRequestLogger().info(
      { deliveryMode: "disabled" },
      "[email] delivery skipped",
    )
    return
  }
  if (serverEnv.EMAIL_MODE === "log") {
    getRequestLogger().info(
      { deliveryMode: "log", subject: email.subject, link },
      "[email] logged instead of sent",
    )
    return
  }
  if (!serverEnv.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required when EMAIL_MODE=resend")
  }
  const resend = new Resend(serverEnv.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: "Webapp Starter Kit <onboarding@resend.dev>",
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
  if (error) {
    getRequestLogger().error(
      { upstreamError: error },
      "[email] provider rejected delivery",
    )
    throw new Error("Email delivery failed")
  }
}

export const mailer = {
  async sendMagicLink(recipient: string, url: string) {
    const trustedUrl = validateTrustedUrl(url)
    await deliver(
      recipient,
      await renderEmail(
        m.email_magic_preview(),
        createElement(MagicLinkEmail, { url: trustedUrl }),
      ),
      trustedUrl,
    )
  },
  async sendWelcome(recipient: string) {
    await deliver(
      recipient,
      await renderEmail(m.email_welcome_preview(), createElement(WelcomeEmail)),
    )
  },
}
