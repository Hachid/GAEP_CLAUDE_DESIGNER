import type { Metadata } from 'next'
import './globals.css'
import { VariavelMesProvider } from '@/lib/variavelMes'

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
      <body suppressHydrationWarning>
        <VariavelMesProvider>{children}</VariavelMesProvider>
      </body>
    </html>
  )
}
