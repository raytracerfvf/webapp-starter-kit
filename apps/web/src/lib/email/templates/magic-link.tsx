import { Button, Text } from "@react-email/components"

import { m } from "@/i18n"

import { EmailLayout } from "../components/email-layout"

export interface MagicLinkEmailProps {
  url: string
}

export function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <EmailLayout
      preview={m.email_magic_preview()}
      title={m.email_magic_title()}
    >
      <Text>{m.email_magic_expiry()}</Text>
      <Button
        href={url}
        style={{
          backgroundColor: "#315ee7",
          borderRadius: "8px",
          color: "white",
          display: "inline-block",
          fontWeight: 700,
          marginTop: "16px",
          padding: "12px 20px",
          textDecoration: "none",
        }}
      >
        {m.email_magic_action()}
      </Button>
      <Text
        style={{
          color: "#697386",
          fontSize: "12px",
          marginTop: "24px",
          wordBreak: "break-all",
        }}
      >
        {url}
      </Text>
    </EmailLayout>
  )
}

MagicLinkEmail.PreviewProps = {
  url: "http://localhost:3000/api/auth/magic-link/verify?token=preview",
} satisfies MagicLinkEmailProps

export default MagicLinkEmail
