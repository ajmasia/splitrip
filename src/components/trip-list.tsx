import Link from 'next/link'

import { Pill } from '@/components/pill'
import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatDateRange } from '@/lib/i18n/format'
import { formatAmount } from '@/lib/money/amount'
import type { TripSummary } from '@/lib/trips/queries'

function people(count: number, t: Translate) {
  return count === 1 ? t('trips.people.one') : t('trips.people.other', { count })
}

function expenses(count: number, t: Translate) {
  if (count === 0) return t('trips.expenses.none')
  return count === 1 ? t('trips.expenses.one') : t('trips.expenses.other', { count })
}

function RolePill({ trip, t }: { trip: TripSummary; t: Translate }) {
  if (trip.yourRole === null) return null
  return trip.yourRole === 'admin' ? (
    <Pill tone="accent">{t('trips.role.admin')}</Pill>
  ) : (
    <Pill>{t('trips.role.participant')}</Pill>
  )
}

function StatusPill({ trip, t }: { trip: TripSummary; t: Translate }) {
  if (trip.status === 'open') return null
  return <Pill tone="quiet">{t('trips.status.closed')}</Pill>
}

/**
 * The same trips, twice over: stacked cards for a thumb and a table for a desk. Both are in the
 * document and CSS decides which one is shown, because rendering a different tree depending on a
 * width measured in JavaScript is what makes the server and the browser disagree on the first
 * paint. Only one of the two is ever displayed, so only one reaches a screen reader.
 */
export function TripList({
  trips,
  locale,
  t,
}: {
  trips: TripSummary[]
  locale: Locale
  t: Translate
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const dates = (trip: TripSummary) => formatDateRange(trip.startDate, trip.endDate, locale)

  return (
    <>
      <ul className="flex flex-col gap-3 wide:hidden">
        {trips.map((trip) => (
          <li key={trip.id}>
            <Link
              href={`/trips/${trip.id}`}
              className="flex min-h-touch flex-col gap-1 rounded-card border border-rule bg-surface p-3"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{trip.name}</span>
                <span className="tabular font-semibold">{amount(trip.totalCents)}</span>
              </span>
              <span className="text-sm text-ink-soft">
                {dates(trip) ?? t('trips.dates.none')} · {people(trip.participantCount, t)} ·{' '}
                {expenses(trip.expenseCount, t)}
              </span>
              <span className="flex flex-wrap items-center gap-2 pt-1">
                <RolePill trip={trip} t={t} />
                <StatusPill trip={trip} t={t} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto wide:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-left font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase">
              <th scope="col" className="py-2 pr-3 font-medium">
                {t('trips.column.name')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('trips.column.dates')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t('trips.column.people')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('trips.column.role')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('trips.column.status')}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t('trips.column.spent')}
              </th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id} className="border-b border-rule">
                <td className="py-2 pr-3">
                  <Link href={`/trips/${trip.id}`} className="font-medium text-accent">
                    {trip.name}
                  </Link>
                </td>
                <td className="tabular px-3 py-2 text-ink-soft">
                  {dates(trip) ?? t('trips.dates.none')}
                </td>
                <td className="tabular px-3 py-2 text-right">{trip.participantCount}</td>
                <td className="px-3 py-2">
                  <RolePill trip={trip} t={t} />
                </td>
                <td className="px-3 py-2 text-ink-soft">
                  {t(trip.status === 'open' ? 'trips.status.open' : 'trips.status.closed')}
                </td>
                <td className="tabular py-2 pl-3 text-right font-medium">
                  {amount(trip.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
