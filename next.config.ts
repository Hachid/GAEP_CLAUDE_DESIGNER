import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium', 'playwright', 'sharp'],
  experimental: {
    serverActions: {
      /** Upload de fotos do relatório (FormData + imagem) */
      bodySizeLimit: '8mb',
    },
  },
}

// Wrap with Sentry only when @sentry/nextjs is installed and DSN is set.
// To activate: npm install @sentry/nextjs, then set NEXT_PUBLIC_SENTRY_DSN.
async function buildConfig(): Promise<NextConfig> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return nextConfig
  try {
    const { withSentryConfig } = await import('@sentry/nextjs')
    return withSentryConfig(nextConfig, {
      silent: true,
      telemetry: false,
    })
  } catch {
    return nextConfig
  }
}

export default buildConfig()
