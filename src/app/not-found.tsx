import Link from 'next/link'

import { AppShell } from '@/components/app-shell'
import { getViewer } from '@/lib/auth/viewer'
import { getCopy } from '@/lib/i18n/server'

export default async function NotFound() {
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex max-w-prose flex-col gap-4">
        <h1 className="text-2xl font-bold">{t('notFound.heading')}</h1>
        <p className="text-ink-soft">{t('notFound.body')}</p>
        <Link
          href="/"
          className="flex min-h-touch w-fit items-center rounded-card border border-rule px-4 text-ink-soft"
        >
          {t('error.page.home')}
        </Link>
      </div>
    </AppShell>
  )
}
