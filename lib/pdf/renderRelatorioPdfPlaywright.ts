/**
 * HTML → PDF via Chromium.
 *
 * - **Vercel (Linux serverless):** `playwright-core` + `@sparticuz/chromium` (binário
 *   adequado ao limite de bundle; ver KB da Vercel sobre Puppeteer/Chromium).
 * - **Windows/macOS (dev):** Chrome/Edge instalado (`channel`) ou `PUPPETEER_EXECUTABLE_PATH`
 *   ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` (ex.: após `npx playwright install chromium`).
 */

import type { Browser } from 'playwright-core'

const SANDBOX_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'] as const

function isVercel(): boolean {
  return process.env.VERCEL === '1'
}

async function launchChromiumVercel(): Promise<Browser> {
  const { chromium: pw } = await import('playwright-core')
  const chromium = (await import('@sparticuz/chromium')).default

  ;(chromium as { setGraphicsMode?: boolean }).setGraphicsMode = false

  return pw.launch({
    args: [...chromium.args, ...SANDBOX_ARGS],
    executablePath: await chromium.executablePath(),
    headless: true,
  })
}

async function launchChromiumLocal(): Promise<Browser> {
  const { chromium: pw } = await import('playwright-core')

  const attempts: Array<{ label: string; launch: () => Promise<Browser> }> = []

  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    attempts.push({
      label: 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH',
      launch: () =>
        pw.launch({
          headless: true,
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: [...SANDBOX_ARGS],
        }),
    })
  }

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    attempts.push({
      label: 'PUPPETEER_EXECUTABLE_PATH',
      launch: () =>
        pw.launch({
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          args: [...SANDBOX_ARGS],
        }),
    })
  }

  attempts.push({
    label: 'channel:chrome',
    launch: () =>
      pw.launch({
        headless: true,
        channel: 'chrome',
        args: [...SANDBOX_ARGS],
      }),
  })

  attempts.push({
    label: 'channel:msedge',
    launch: () =>
      pw.launch({
        headless: true,
        channel: 'msedge',
        args: [...SANDBOX_ARGS],
      }),
  })

  attempts.push({
    label: 'playwright (devDependency) bundled Chromium',
    launch: async () => {
      const full = await import('playwright')
      return full.chromium.launch({
        headless: true,
        args: [...SANDBOX_ARGS],
      })
    },
  })

  let last: unknown
  for (const { label, launch } of attempts) {
    try {
      return await launch()
    } catch (e) {
      last = e
      console.warn(`[pdf] Chromium (${label}) falhou:`, e instanceof Error ? e.message : e)
    }
  }

  throw new Error(
    'Não foi possível iniciar o Chromium. Em desenvolvimento: instale o Google Chrome, defina PUPPETEER_EXECUTABLE_PATH ou PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, ou execute `npx playwright install chromium` (com o pacote dev `playwright` instalado).',
    { cause: last }
  )
}

async function launchChromium(): Promise<Browser> {
  if (isVercel()) {
    return launchChromiumVercel()
  }
  return launchChromiumLocal()
}

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await launchChromium()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    })
    return Buffer.from(buf)
  } finally {
    await browser.close()
  }
}
