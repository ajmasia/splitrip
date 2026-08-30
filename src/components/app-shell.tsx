import type { ReactNode } from 'react'

import { LanguageSwitcher } from '@/components/language-switcher'
import type { Locale, Translate } from '@/lib/i18n'

/**
 * The frame every screen sits in.
 *
 * On a phone the `bottom` slot is pinned to the bottom edge, where a thumb reaches without the hand
 * shifting its grip, and it clears the home indicator of a notched screen. Above the breakpoint the
 * same slot simply follows the content: on a desktop the bottom of the window is the furthest thing
 * from the pointer, so pinning it there would be worse rather than better.
 */
export function AppShell({
  locale,
  t,
  bottom,
  children,
}: {
  locale: Locale
  t: Translate
  bottom?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <p className="font-display text-xl font-extrabold tracking-tight">
            Split<span className="text-accent">rip</span>
          </p>
          <LanguageSwitcher locale={locale} t={t} />
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-3xl flex-1 px-4 py-6 ${bottom ? 'pb-28 wide:pb-6' : ''}`}
      >
        {children}
      </main>

      {bottom ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-surface-2 pb-[env(safe-area-inset-bottom)] wide:static wide:bg-transparent">
          <div className="mx-auto w-full max-w-3xl px-4 py-2">{bottom}</div>
        </div>
      ) : null}
    </div>
  )
}
