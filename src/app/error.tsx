'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { translator } from '@/lib/i18n'
import { localeFromDocument } from '@/lib/i18n/browser'

/**
 * Anything a screen throws lands here instead of taking the page down with it. A trip's numbers come
 * from a database over a network, and the honest answer when that fails once is to say so and offer
 * another go.
 *
 * The prop is `retry`, not `reset`: it was renamed in Next.js 16.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const t = translator(localeFromDocument())

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="font-display text-2xl font-bold">{t('error.page.heading')}</h1>
      <p className="max-w-prose text-ink-soft">{t('error.page.body')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="min-h-touch cursor-pointer rounded-card bg-accent px-4 font-semibold text-accent-ink"
        >
          {t('error.page.retry')}
        </button>
        <Link
          href="/"
          className="flex min-h-touch items-center rounded-card border border-rule px-4 text-ink-soft"
        >
          {t('error.page.home')}
        </Link>
      </div>
      {error.digest ? <p className="font-mono text-xs text-ink-faint">{error.digest}</p> : null}
    </main>
  )
}
