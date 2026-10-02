import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { DashboardTable } from '@/components/dashboard-table'
import { PaymentHistory } from '@/components/payment-history'
import { SettlementPlan } from '@/components/settlement-plan'
import { Figure } from '@/components/trip-figures'
import { getViewer } from '@/lib/auth/viewer'
import { intlLocale } from '@/lib/i18n'
import { formatShortDate } from '@/lib/i18n/format'
import { getCopy } from '@/lib/i18n/server'
import { formatAmount } from '@/lib/money/amount'
import { dashboardFor } from '@/lib/trips/dashboard'
import { getClosingSummary, getTrip } from '@/lib/trips/queries'

/**
 * How the trip ended, for everybody in it: read from the summary frozen when it was closed, never
 * from the live tables, so what it says is what the trip came to and stays that way while it is
 * closed.
 */
export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  // Somebody outside the trip gets nothing back from Row Level Security, and so a not-found.
  const found = await getTrip(id)
  if (!found || found.trip.yourRole === null) notFound()

  const { trip, participants } = found
  const you = participants.find((participant) => participant.isYou)
  const summary = await getClosingSummary(id, you?.id ?? null)
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))

  const back = (
    <Link
      href={`/trips/${id}`}
      className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
    >
      ← {trip.name}
    </Link>
  )

  if (summary === null) {
    return (
      <AppShell locale={locale} t={t} viewer={viewer}>
        <div className="flex flex-col gap-4">
          {back}
          <div className="flex max-w-prose flex-col gap-3 rounded-card border border-rule bg-surface p-4">
            <h1 className="text-xl font-bold">{t('summary.open.title')}</h1>
            <p className="text-ink-soft">{t('summary.open.body')}</p>
            <Link
              href={`/trips/${id}/balances`}
              className="flex min-h-touch w-fit items-center rounded-card bg-accent px-4 text-sm font-semibold text-accent-ink"
            >
              {t('trip.balances')}
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  // The per-participant table is the dashboard's, fed the frozen figures instead of the live ones.
  const table = dashboardFor(
    {
      ...trip,
      totalCents: summary.totalCents,
      sharedCents: summary.sharedCents,
      contributedCents: summary.contributionsCents,
      expenseCount: summary.expenseCount,
      participantCount: summary.participantCount,
    },
    summary.participants,
  )

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          {back}
          <h1 className="text-2xl font-bold">{t('summary.heading')}</h1>
          <p className="max-w-prose text-ink-soft">{t('summary.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 wide:grid-cols-3 wide:gap-3">
          <Figure
            label={t('trips.column.spent')}
            amount={amount(summary.totalCents)}
            className="col-span-2 wide:col-span-1"
          />
          <Figure label={t('trip.figure.perPerson')} amount={amount(summary.costPerPersonCents)} />
          <Figure label={t('trip.figure.unsplit')} amount={amount(summary.contributionsCents)} />
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('dashboard.people')}
          </h2>
          <DashboardTable dashboard={table} tripId={id} locale={locale} t={t} />
          <p className="max-w-prose text-sm text-ink-soft">{t('dashboard.note')}</p>
        </section>

        {summary.contributions.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
              {t('summary.contributions')}
            </h2>
            <ul className="flex flex-col">
              {summary.contributions.map((contribution) => (
                <li
                  key={contribution.expenseId}
                  className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{contribution.description}</span>
                    <span className="text-sm text-ink-soft">
                      {t('summary.contribution.by', { name: contribution.payerName })} ·{' '}
                      {formatShortDate(contribution.spentOn, locale)}
                    </span>
                  </span>
                  <span className="tabular font-semibold">{amount(contribution.amountCents)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('settlement.heading')}
          </h2>
          <SettlementPlan
            plan={summary.plan}
            tripId={id}
            organising={false}
            recording={false}
            locale={locale}
            t={t}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('payments.heading')}
          </h2>
          <PaymentHistory
            payments={summary.payments.map((payment) => ({
              id: payment.paymentId,
              fromName: payment.fromName,
              toName: payment.toName,
              amountCents: payment.amountCents,
              paidOn: payment.paidOn,
              voided: payment.voided,
              createdBy: '',
            }))}
            tripId={id}
            yourParticipantId={you?.id ?? null}
            organising={false}
            voiding={false}
            locale={locale}
            t={t}
          />
        </section>
      </div>
    </AppShell>
  )
}
