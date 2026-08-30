import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { TripRealtime } from '@/components/trip-realtime'
import { BalanceSheet } from '@/components/balance-sheet'
import { PaymentHistory } from '@/components/payment-history'
import { SettlementPlan } from '@/components/settlement-plan'
import { getViewer } from '@/lib/auth/viewer'
import { intlLocale } from '@/lib/i18n'
import { getCopy } from '@/lib/i18n/server'
import { formatAmount } from '@/lib/money/amount'
import { getTrip, listBalances, listPayments } from '@/lib/trips/queries'
import { planFor } from '@/lib/trips/settlement'

export default async function BalancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  if (trip.yourRole === null) notFound()

  const [balances, payments] = await Promise.all([
    listBalances(id, participants),
    listPayments(id, participants),
  ])
  const plan = planFor(balances)
  const yours = balances.find((balance) => balance.isYou)
  const net = yours?.netCents ?? 0
  const owing = net < 0
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <TripRealtime tripId={id} youParticipantId={yours?.participantId ?? null} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href={`/trips/${id}`}
            className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
          >
            ← {trip.name}
          </Link>
          <h1 className="text-2xl font-bold">{t('balances.heading')}</h1>
          <p className="max-w-prose text-ink-soft">{t('balances.subtitle')}</p>
        </div>

        {/*
          Everything else on this screen is the group's; this is the reader's own position, which is
          the one figure they came for. It says the direction in words before the amount, so the
          colour is a second reading of it rather than the only one, and it names the person on the
          other side: "you owe 9.95" is an answer, "pay Brienne 9.95" is an instruction.
        */}
        {yours ? (
          <div
            className={`flex max-w-prose flex-col gap-1 rounded-card border p-4 ${
              owing ? 'border-debt bg-debt-soft' : 'border-rule bg-surface'
            }`}
          >
            <p className={`text-lg font-semibold ${owing ? 'text-debt' : ''}`}>
              {net === 0
                ? t('balances.you.settled')
                : t(owing ? 'balances.you.owe' : 'balances.you.owed', {
                    amount: amount(Math.abs(net)),
                  })}
            </p>
            <p className="text-ink-soft">
              {t(
                net === 0
                  ? 'balances.you.settled.body'
                  : owing
                    ? 'balances.you.owe.body'
                    : 'balances.you.owed.body',
              )}
            </p>
            {plan.some((line) => line.yours !== null) ? (
              <ul className="flex flex-col gap-1 pt-2">
                {plan
                  .filter((line) => line.yours !== null)
                  .map((line, index) => (
                    <li key={index} className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold">
                        {line.yours === 'pay'
                          ? t('settlement.you.pay', { name: line.toName })
                          : t('settlement.you.collect', { name: line.fromName })}
                      </span>
                      <span className="leader" aria-hidden="true" />
                      <span className="tabular font-semibold">{amount(line.amountCents)}</span>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('settlement.heading')}
          </h2>
          <SettlementPlan
            plan={plan}
            tripId={id}
            organising={trip.yourRole === 'admin'}
            recording={trip.status === 'open'}
            locale={locale}
            t={t}
          />
          {plan.length > 0 ? (
            <p className="max-w-prose text-sm text-ink-soft">{t('settlement.note')}</p>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('balances.everyone')}
          </h2>
          <BalanceSheet balances={balances} tripId={id} locale={locale} t={t} />
          <p className="max-w-prose text-sm text-ink-soft">{t('balances.total.note')}</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('payments.heading')}
          </h2>
          <PaymentHistory
            payments={payments}
            tripId={id}
            yourParticipantId={yours?.participantId ?? null}
            organising={trip.yourRole === 'admin'}
            voiding={trip.status === 'open'}
            locale={locale}
            t={t}
          />
        </section>
      </div>
    </AppShell>
  )
}
