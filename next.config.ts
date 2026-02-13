import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ["*.ngrok-free.app", "192.168.1.109"],
}

export default withNextIntl(nextConfig)
