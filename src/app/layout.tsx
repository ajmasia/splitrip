import type { Metadata, Viewport } from 'next'
import { Archivo, Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { ConnectionBar } from '@/components/connection-bar'
import { getLocale } from '@/lib/i18n/server'
import { THEME_COLOUR } from '@/lib/theme'
import { getTheme } from '@/lib/theme/server'

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
  applicationName: 'Splitrip',
  // iOS does not read the manifest. Added to the home screen it opens full screen only if these
  // say so, and it labels the icon from `title` here rather than from the manifest's name.
  appleWebApp: {
    capable: true,
    title: 'Splitrip',
    statusBarStyle: 'default',
  },
  // `capable` emits the standardised name, which Safari has only read since iOS 16.4. The old
  // Apple-prefixed one is what an older iPhone looks for, and it is one line to keep those working.
  other: { 'apple-mobile-web-app-capable': 'yes' },
}

/*
 * The colour of the browser chrome, and of the status bar of the installed application. It is a
 * pair of media queries only while the reader has made no choice: a media query cannot see a
 * cookie, so once they have chosen, the pair would keep colouring the frame after the operating
 * system rather than after them.
 */
export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme()

  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor:
      theme === 'system'
        ? [
            { media: '(prefers-color-scheme: light)', color: THEME_COLOUR.light },
            { media: '(prefers-color-scheme: dark)', color: THEME_COLOUR.dark },
          ]
        : THEME_COLOUR[theme],
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()])

  return (
    <html
      lang={locale}
      // Absent while the reader follows their operating system, which is what the stylesheet
      // assumes: the attribute exists to override that, not to state it.
      data-theme={theme === 'system' ? undefined : theme}
      className={`${archivo.variable} ${bricolage.variable} ${plexMono.variable}`}
    >
      <body>
        <ConnectionBar />
        {children}
      </body>
    </html>
  )
}
