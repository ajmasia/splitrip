import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { BalanceSheet } from '@/components/balance-sheet'
import { getViewer } from '@/lib/auth/viewer'
import { intlLocale } from '@/lib/i18n'
import { getCopy } from '@/lib/i18n/server'
import { formatAmount } from '@/lib/money/amount'
import { getTrip, listBalances } from '@/lib/trips/queries'

export default async function BalancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  if (trip.yourRole === null) notFound()

  const balances = await listBalances(id, participants)
  const yours = balances.find((balance) => balance.isYou)
  const net = yours?.netCents ?? 0
  const owing = net < 0

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
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
          colour is a second reading of it rather than the only one.
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
                    amount: formatAmount(Math.abs(net), intlLocale(locale)),
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
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('balances.everyone')}
          </h2>
          <BalanceSheet balances={balances} locale={locale} t={t} />
          <p className="max-w-prose text-sm text-ink-soft">{t('balances.total.note')}</p>
        </section>
      </div>
    </AppShell>
  )
}
