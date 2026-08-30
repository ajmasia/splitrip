import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { getLocale } from '@/lib/i18n/server'

import './globals.css'

export const metadata: Metadata = {
  title: 'Splitrip',
  description: 'Shared travel expenses, settled in seconds.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  )
}
