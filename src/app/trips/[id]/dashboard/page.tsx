import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { DailySpending } from '@/components/daily-spending'
import { DashboardTable } from '@/components/dashboard-table'
import { OrganiserOnly } from '@/components/organiser-only'
import { TripRealtime } from '@/components/trip-realtime'
import { Figure } from '@/components/trip-figures'
import { getViewer } from '@/lib/auth/viewer'
import { intlLocale } from '@/lib/i18n'
import { getCopy } from '@/lib/i18n/server'
import { formatAmount } from '@/lib/money/amount'
import { dashboardFor, spendingByDay } from '@/lib/trips/dashboard'
import { getTrip, listBalances, listExpenses } from '@/lib/trips/queries'

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  // Somebody outside the trip learns nothing about it; a `participant` is told what this is instead.
  if (trip.yourRole === null) notFound()
  if (trip.yourRole !== 'admin') {
    return (
      <AppShell locale={locale} t={t} viewer={viewer}>
        <OrganiserOnly tripId={id} tripName={trip.name} t={t} />
      </AppShell>
    )
  }

  const [balances, expenses] = await Promise.all([listBalances(id, participants), listExpenses(id)])
  const dashboard = dashboardFor(trip, balances)
  const you = participants.find((participant) => participant.isYou)
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const share = (percent: number | null) =>
    percent === null ? undefined : t('dashboard.figure.share', { percent })

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <TripRealtime tripId={id} youParticipantId={you?.id ?? null} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href={`/trips/${id}`}
            className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
          >
            ← {trip.name}
          </Link>
          <h1 className="text-2xl font-bold">{t('dashboard.heading')}</h1>
          <p className="max-w-prose text-ink-soft">{t('dashboard.subtitle')}</p>
          <Link
            href={`/trips/${id}/dashboard/expenses`}
            className="flex min-h-touch w-fit items-center rounded-card border border-rule px-4 text-sm font-semibold"
          >
            {t('dashboard.expenses')}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 wide:grid-cols-3 wide:gap-3">
          <Figure
            label={t('trips.column.spent')}
            amount={amount(dashboard.totalCents)}
            className="col-span-2 wide:col-span-1"
          />
          <Figure
            label={t('dashboard.figure.shared')}
            amount={amount(dashboard.sharedCents)}
            note={share(dashboard.sharedPercent)}
          />
          <Figure
            label={t('trip.figure.unsplit')}
            amount={amount(dashboard.contributedCents)}
            note={share(dashboard.contributedPercent)}
          />
          <Figure label={t('dashboard.figure.count')} amount={String(dashboard.expenseCount)} />
          <Figure label={t('trip.figure.perPerson')} amount={amount(dashboard.perPersonCents)} />
        </div>

        {expenses.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
              {t('dashboard.daily')}
            </h2>
            <DailySpending days={spendingByDay(expenses)} locale={locale} t={t} />
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('dashboard.people')}
          </h2>
          {dashboard.expenseCount === 0 ? (
            <div className="flex max-w-prose flex-col gap-1 rounded-card border border-dashed border-rule p-4">
              <p className="font-semibold">{t('expenses.empty.title')}</p>
              <p className="text-ink-soft">{t('dashboard.empty.body')}</p>
            </div>
          ) : (
            <>
              <DashboardTable dashboard={dashboard} tripId={id} locale={locale} t={t} />
              <p className="max-w-prose text-sm text-ink-soft">{t('dashboard.note')}</p>
            </>
          )}
        </section>
      </div>
    </AppShell>
  )
}
