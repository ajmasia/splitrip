import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { StatementSection } from '@/components/statement-section'
import { TripRealtime } from '@/components/trip-realtime'
import { getViewer } from '@/lib/auth/viewer'
import { intlLocale } from '@/lib/i18n'
import { getCopy } from '@/lib/i18n/server'
import { formatAmount } from '@/lib/money/amount'
import { getStatement, getTrip } from '@/lib/trips/queries'

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string; participantId: string }>
}) {
  const { id, participantId } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  if (trip.yourRole === null) notFound()

  const who = participants.find((participant) => participant.id === participantId)
  if (!who) notFound()

  const statement = await getStatement(who, participants)
  const you = participants.find((participant) => participant.isYou)
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const owing = statement.netCents < 0

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <TripRealtime tripId={id} youParticipantId={you?.id ?? null} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href={`/trips/${id}/balances`}
            className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
          >
            ← {t('balances.heading')}
          </Link>
          <h1 className="text-2xl font-bold">
            {t('statement.heading', { name: statement.displayName })}
          </h1>
          <p className="max-w-prose text-ink-soft">{t('statement.subtitle')}</p>
        </div>

        <StatementSection
          title={t('statement.charged')}
          note={t('statement.charged.note')}
          lines={statement.charges}
          totalCents={statement.chargedCents}
          empty={t('statement.charged.empty')}
          tripId={id}
          locale={locale}
        />

        <StatementSection
          title={t('statement.fronted')}
          note={t('statement.fronted.note')}
          lines={statement.fronted}
          totalCents={statement.paidCents}
          empty={t('statement.fronted.empty')}
          tripId={id}
          locale={locale}
        />

        {statement.settlements.length > 0 ? (
          <StatementSection
            title={t('statement.settlements')}
            note={t('statement.settlements.note')}
            lines={statement.settlements}
            totalCents={statement.settlementsCents}
            empty=""
            locale={locale}
          />
        ) : null}

        {/*
          The arithmetic, spelled out. Everything above is a list somebody can check against the
          expense it came from; this is the one line that says those lists are the whole of it.
        */}
        <section className="flex max-w-prose flex-col gap-2">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('statement.balance')}
          </h2>
          <p className="tabular rule-double pt-2 text-sm text-ink-soft">
            {amount(statement.paidCents)} − {amount(statement.chargedCents)}
            {statement.settlementsCents === 0
              ? ''
              : ` ${statement.settlementsCents > 0 ? '+' : '−'} ${amount(Math.abs(statement.settlementsCents))}`}
          </p>
          <p className={`tabular text-2xl font-semibold ${owing ? 'text-debt' : ''}`}>
            {statement.netCents > 0 ? '+' : ''}
            {amount(statement.netCents)}
          </p>
          <p className="text-ink-soft">
            {t(
              statement.netCents === 0
                ? 'statement.square'
                : owing
                  ? 'statement.owes'
                  : 'statement.owed',
              { name: statement.displayName, amount: amount(Math.abs(statement.netCents)) },
            )}
          </p>
        </section>

        {statement.contributions.length > 0 ? (
          <StatementSection
            title={t('statement.contributed')}
            note={t('statement.contributed.note')}
            lines={statement.contributions}
            totalCents={statement.contributedCents}
            empty=""
            tripId={id}
            locale={locale}
          />
        ) : null}
      </div>
    </AppShell>
  )
}
