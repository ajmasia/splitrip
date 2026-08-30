import Link from 'next/link'
import type { ReactNode } from 'react'

import { signOut } from '@/app/actions/auth'
import { LanguageSwitcher } from '@/components/language-switcher'
import type { Viewer } from '@/lib/auth/viewer'
import type { Locale, Translate } from '@/lib/i18n'

function Account({ viewer, t }: { viewer: Viewer | null; t: Translate }) {
  if (viewer === null || viewer.isAnonymous) {
    return (
      <Link
        href="/sign-in"
        className="flex min-h-touch items-center rounded-card px-3 text-sm text-ink-soft"
      >
        {t('account.signIn')}
      </Link>
    )
  }

  return (
    <form action={signOut} className="flex items-center gap-2">
      <span className="hidden text-sm text-ink-soft wide:inline">{viewer.email}</span>
      <button
        type="submit"
        className="min-h-touch cursor-pointer rounded-card px-3 text-sm text-ink-soft"
      >
        {t('account.signOut')}
      </button>
    </form>
  )
}

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
  viewer = null,
  bottom,
  children,
}: {
  locale: Locale
  t: Translate
  viewer?: Viewer | null
  bottom?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex min-h-touch items-center font-display text-2xl font-extrabold tracking-tight wide:text-3xl"
          >
            Split<span className="text-accent">rip</span>
          </Link>
          <div className="flex items-center gap-1">
            <Account viewer={viewer} t={t} />
            <LanguageSwitcher locale={locale} t={t} />
          </div>
        </div>
      </header>

      {/*
        `flex-1` is what pins the bar to the bottom edge on a phone, and what has to stop doing so
        above the breakpoint: with the bar back in the flow, a stretched main would push it to the
        bottom of the window anyway, which is the one place a pointer never is.
      */}
      <main
        className={`mx-auto w-full max-w-3xl flex-1 px-4 py-6 ${bottom ? 'pb-28 wide:flex-none wide:pb-6' : ''}`}
      >
        {children}
      </main>

      {bottom ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-surface-2 pb-[env(safe-area-inset-bottom)] wide:static wide:border-t-0 wide:bg-transparent">
          <div className="mx-auto w-full max-w-3xl px-4 py-2">{bottom}</div>
        </div>
      ) : null}
    </div>
  )
}
