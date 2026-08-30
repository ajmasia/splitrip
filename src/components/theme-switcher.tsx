import type { ReactNode } from 'react'

import { setTheme } from '@/app/actions/theme'
import type { CopyKey, Translate } from '@/lib/i18n'
import { nextTheme, type Theme } from '@/lib/theme'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/**
 * The icon shows the state the interface is in, not the one the button leads to: it is read as a
 * label far more often than it is pressed, and a control that displays what it is about to become
 * lies about the present nine times out of ten.
 */
const ICON: Record<Theme, ReactNode> = {
  // Half filled, for a palette that is somebody else's decision.
  system: (
    <>
      <circle cx="10" cy="10" r="6.5" {...stroke} />
      <path d="M10 3.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" />
    </>
  ),
  light: (
    <>
      <circle cx="10" cy="10" r="3.75" {...stroke} />
      <path
        d="M10 2v1.75M10 16.25V18M18 10h-1.75M3.75 10H2M15.66 4.34l-1.24 1.24M5.58 14.42l-1.24 1.24M15.66 15.66l-1.24-1.24M5.58 5.58 4.34 4.34"
        {...stroke}
      />
    </>
  ),
  dark: <path d="M16 11.7A6.8 6.8 0 1 1 8.3 4a5.6 5.6 0 0 0 7.7 7.7z" {...stroke} />,
}

const NAME: Record<Theme, CopyKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
}

/**
 * A plain form with a server function behind it, as the language switcher is: the choice lives in a
 * cookie the server reads before it renders, so the palette is right in the first paint and there
 * is nothing to flash.
 */
export function ThemeSwitcher({ theme, t }: { theme: Theme; t: Translate }) {
  const next = nextTheme(theme)

  return (
    <form action={setTheme} className="flex items-center">
      <button
        name="theme"
        value={next}
        title={t(NAME[theme])}
        aria-label={t('theme.switch', { current: t(NAME[theme]), next: t(NAME[next]) })}
        className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-card text-ink-soft"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          {ICON[theme]}
        </svg>
      </button>
    </form>
  )
}
