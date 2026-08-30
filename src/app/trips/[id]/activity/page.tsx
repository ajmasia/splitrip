import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ActivityFeed } from '@/components/activity-feed'
import { AppShell } from '@/components/app-shell'
import { TripRealtime } from '@/components/trip-realtime'
import { getViewer } from '@/lib/auth/viewer'
import { getCopy } from '@/lib/i18n/server'
import { getTrip, listActivity } from '@/lib/trips/queries'

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  if (trip.yourRole === null) notFound()

  const entries = await listActivity(id, participants)

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <TripRealtime tripId={id} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href={`/trips/${id}`}
            className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
          >
            ← {trip.name}
          </Link>
          <h1 className="text-2xl font-bold">{t('activity.heading')}</h1>
          <p className="max-w-prose text-ink-soft">{t('activity.subtitle')}</p>
        </div>

        <ActivityFeed entries={entries} locale={locale} t={t} />
      </div>
    </AppShell>
  )
}
