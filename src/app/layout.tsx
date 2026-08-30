import type { Metadata, Viewport } from 'next'
import { Archivo, Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { getLocale } from '@/lib/i18n/server'

import './globals.css'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Splitrip',
  description: 'Shared travel expenses, settled in seconds.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#edefec' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1211' },
  ],
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      className={`${archivo.variable} ${bricolage.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
