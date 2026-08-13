import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"

import { getLocale, m } from "@/i18n"

export function EmailLayout({
  preview,
  title,
  children,
}: {
  preview: string
  title: string
  children: ReactNode
}) {
  return (
    <Html lang={getLocale()}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f5f7fb",
          color: "#182033",
          fontFamily: "Arial, sans-serif",
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e4e8f0",
            borderRadius: "12px",
            margin: "0 auto",
            maxWidth: "560px",
            padding: "32px",
          }}
        >
          <Heading
            style={{
              fontSize: "26px",
              letterSpacing: "-0.03em",
              margin: "0 0 20px",
            }}
          >
            {title}
          </Heading>
          <Section>{children}</Section>
          <Text
            style={{ color: "#697386", fontSize: "12px", marginTop: "32px" }}
          >
            {m.app_name()}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
