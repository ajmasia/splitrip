import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { ChangeRoleButton } from '@/components/change-role-button'
import { ExpenseList } from '@/components/expense-list'
import { Pill } from '@/components/pill'
import { RemoveParticipantButton } from '@/components/remove-participant-button'
import { intlLocale } from '@/lib/i18n'
import { formatDateRange } from '@/lib/i18n/format'
import { getViewer } from '@/lib/auth/viewer'
import { getCopy } from '@/lib/i18n/server'
import { formatAmount } from '@/lib/money/amount'
import { getTrip, listExpenses } from '@/lib/trips/queries'

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  // A trip somebody does not take part in is not hidden by this check but by Row Level Security,
  // which returns no row at all. Reaching here with nothing means exactly that.
  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  const expenses = await listExpenses(id)
  // Stepping down is a role change like any other, so this one appears beside yourself too.
  const organising = trip.yourRole === 'admin' && trip.status === 'open'

  // Pinned to the bottom edge on a phone by the shell, which is where a thumb reaches: recording an
  // expense is the one thing somebody does while the trip is happening.
  const record =
    trip.yourRole !== null && trip.status === 'open' ? (
      <Link
        href={`/trips/${id}/expenses/new`}
        className="flex min-h-touch w-full items-center justify-center rounded-card bg-accent px-4 font-semibold text-accent-ink wide:w-fit"
      >
        {t('expenses.record')}
      </Link>
    ) : undefined
  const dates = formatDateRange(trip.startDate, trip.endDate, locale)

  return (
    <AppShell locale={locale} t={t} viewer={viewer} bottom={record}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
          >
            ← {t('trip.back')}
          </Link>
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          <p className="text-ink-soft">{dates ?? t('trips.dates.none')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={trip.status === 'open' ? 'plain' : 'quiet'}>
              {t(trip.status === 'open' ? 'trips.status.open' : 'trips.status.closed')}
            </Pill>
            {trip.yourRole === 'admin' ? <Pill tone="accent">{t('trips.role.admin')}</Pill> : null}
          </div>
          {trip.yourRole === 'admin' && trip.status === 'open' ? (
            <Link
              href={`/trips/${id}/invite`}
              className="flex min-h-touch w-fit items-center rounded-card border border-rule px-4 text-sm font-semibold"
            >
              {t('trip.invite')}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 rounded-card border border-rule bg-surface p-4">
          <p className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('trips.column.spent')}
          </p>
          <p className="tabular text-3xl font-semibold">
            {formatAmount(trip.totalCents, intlLocale(locale))}
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('expenses.heading')}
          </h2>
          {expenses.length === 0 ? (
            <div className="flex max-w-prose flex-col gap-2 rounded-card border border-rule bg-surface p-5">
              <h3 className="text-lg font-semibold">{t('expenses.empty.title')}</h3>
              <p className="text-ink-soft">{t('expenses.empty.body')}</p>
              {trip.status === 'open' ? (
                <Link
                  href={`/trips/${id}/expenses/new`}
                  className="flex min-h-touch w-fit items-center rounded-card border border-rule px-4 font-semibold"
                >
                  {t('expenses.record')}
                </Link>
              ) : null}
            </div>
          ) : (
            <ExpenseList expenses={expenses} locale={locale} t={t} />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('trip.participants')}
          </h2>
          <ul className="flex flex-col">
            {participants.map((participant) => (
              <li
                key={participant.id}
                className="flex flex-col gap-2 border-b border-rule py-3 last:border-b-0 wide:flex-row wide:items-center wide:justify-between"
              >
                <span>
                  {participant.displayName}
                  {participant.isYou ? (
                    <span className="text-ink-soft"> ({t('trip.you')})</span>
                  ) : null}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {participant.role === 'admin' ? (
                    <Pill tone="accent">{t('trips.role.admin')}</Pill>
                  ) : (
                    <Pill>{t('trips.role.participant')}</Pill>
                  )}
                  {organising ? (
                    <ChangeRoleButton
                      participantId={participant.id}
                      tripId={id}
                      role={participant.role}
                      name={participant.displayName}
                      locale={locale}
                    />
                  ) : null}
                  {organising && !participant.isYou ? (
                    <RemoveParticipantButton
                      participantId={participant.id}
                      tripId={id}
                      name={participant.displayName}
                      locale={locale}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}
