import Link from 'next/link'

import { getCopy } from '@/lib/i18n/server'

/**
 * What a navigation falls back to when the network is gone. The service worker caches this page
 * when it installs, so it carries no account state and none of the usual chrome: it has to be the
 * same page for whoever opens it, and a sign-in link on a screen that cannot reach the server would
 * be an invitation to fail.
 */
export default async function OfflinePage() {
  const { t } = await getCopy()

  return (
    <div className="mx-auto flex min-h-dvh max-w-prose flex-col justify-center gap-4 px-4">
      <p className="font-display text-2xl font-extrabold tracking-tight">
        Split<span className="text-accent">rip</span>
      </p>
      <h1 className="text-2xl font-bold">{t('offline.heading')}</h1>
      <p className="text-ink-soft">{t('offline.body')}</p>
      <Link
        href="/"
        className="flex min-h-touch w-fit items-center rounded-card border border-rule px-4 text-ink-soft"
      >
        {t('error.page.retry')}
      </Link>
    </div>
  )
}
