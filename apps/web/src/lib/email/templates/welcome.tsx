import { Text } from "@react-email/components"

import { m } from "@/i18n"

import { EmailLayout } from "../components/email-layout"

export function WelcomeEmail() {
  return (
    <EmailLayout
      preview={m.email_welcome_preview()}
      title={m.email_welcome_title()}
    >
      <Text>{m.email_welcome_body()}</Text>
    </EmailLayout>
  )
}

export default WelcomeEmail
