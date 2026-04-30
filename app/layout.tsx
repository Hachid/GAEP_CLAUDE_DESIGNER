import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GAEP-CAT',
  description: 'Gestão de Atividades e Efetivo Policial',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
