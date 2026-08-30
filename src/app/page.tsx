import Link from 'next/link'

import { AppShell } from '@/components/app-shell'
import { TripList } from '@/components/trip-list'
import { getCopy } from '@/lib/i18n/server'
import { listTrips } from '@/lib/trips/queries'

export default async function HomePage() {
  const { locale, t } = await getCopy()
  const trips = await listTrips()

  const create = (
    <Link
      href="/trips/new"
      className="flex min-h-touch w-full items-center justify-center rounded-card bg-accent px-4 font-semibold text-accent-ink wide:w-fit"
    >
      {t('trips.create')}
    </Link>
  )

  return (
    <AppShell locale={locale} t={t} bottom={create}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('trips.heading')}
          </p>
          <h1 className="text-2xl font-bold">{t('trips.subtitle')}</h1>
        </div>

        {trips.length === 0 ? (
          <div className="flex max-w-prose flex-col gap-2 rounded-card border border-rule bg-surface p-5">
            <h2 className="text-lg font-semibold">{t('trips.empty.title')}</h2>
            <p className="text-ink-soft">{t('trips.empty.body')}</p>
          </div>
        ) : (
          <TripList trips={trips} locale={locale} t={t} />
        )}
      </div>
    </AppShell>
  )
}
