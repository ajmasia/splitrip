import Link from 'next/link'

import { signed, tone } from '@/components/balance-sheet'
import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatAmount } from '@/lib/money/amount'
import type { Dashboard } from '@/lib/trips/dashboard'

/**
 * Everyone's accounts with every term of the sum on show: fronted, minus charged, plus what their
 * settlements moved, is the balance. What somebody treated the group to sits apart, before the
 * arithmetic, because it explains what the trip cost and changes nobody's position.
 *
 * Stacked for a thumb and tabular for a desk, both in the document with CSS choosing between them,
 * the same way the balance sheet does it.
 */
export function DashboardTable({
  dashboard,
  tripId,
  locale,
  t,
}: {
  dashboard: Dashboard
  tripId: string
  locale: Locale
  t: Translate
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const { rows, totals } = dashboard

  return (
    <>
      <ul className="flex flex-col gap-3 wide:hidden">
        {rows.map((row) => (
          <li
            key={row.participantId}
            className="flex flex-col gap-1 rounded-card border border-rule bg-surface p-3"
          >
            <span className="flex items-baseline justify-between gap-3">
              <Link
                href={`/trips/${tripId}/balances/${row.participantId}`}
                aria-label={t('balances.statement.label', { name: row.displayName })}
                className="font-semibold text-accent"
              >
                {row.displayName}
                {row.isYou ? <span className="text-ink-soft"> ({t('trip.you')})</span> : null}
              </Link>
              <span className={`tabular font-semibold ${tone(row.netCents)}`}>
                {signed(row.netCents, locale)}
              </span>
            </span>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm text-ink-soft">
              <dt>{t('balances.column.paid')}</dt>
              <dd className="tabular text-right">{amount(row.paidCents)}</dd>
              <dt>{t('balances.column.charged')}</dt>
              <dd className="tabular text-right">{amount(row.chargedCents)}</dd>
              <dt>{t('dashboard.column.settled')}</dt>
              <dd className="tabular text-right">{signed(row.settledCents, locale)}</dd>
              {row.contributedCents > 0 ? (
                <>
                  <dt>{t('dashboard.column.contributed')}</dt>
                  <dd className="tabular text-right">{amount(row.contributedCents)}</dd>
                </>
              ) : null}
            </dl>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-3 rule-double pt-2">
          <span className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('balances.total')}
          </span>
          <span className="tabular font-semibold">{amount(totals.netCents)}</span>
        </li>
      </ul>

      <div className="hidden overflow-x-auto wide:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-left font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase">
              <th scope="col" className="py-2 pr-3 font-medium">
                {t('balances.column.participant')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t('dashboard.column.contributed')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t('balances.column.paid')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t('balances.column.charged')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t('dashboard.column.settled')}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t('balances.column.net')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.participantId} className="border-b border-rule">
                <td className="py-2 pr-3 font-medium">
                  <Link
                    href={`/trips/${tripId}/balances/${row.participantId}`}
                    aria-label={t('balances.statement.label', { name: row.displayName })}
                    className="text-accent"
                  >
                    {row.displayName}
                  </Link>
                  {row.isYou ? <span className="text-ink-soft"> ({t('trip.you')})</span> : null}
                </td>
                <td className="tabular px-3 py-2 text-right text-ink-faint">
                  {row.contributedCents > 0 ? amount(row.contributedCents) : '—'}
                </td>
                <td className="tabular px-3 py-2 text-right text-ink-soft">
                  {amount(row.paidCents)}
                </td>
                <td className="tabular px-3 py-2 text-right text-ink-soft">
                  {amount(row.chargedCents)}
                </td>
                <td className="tabular px-3 py-2 text-right text-ink-soft">
                  {signed(row.settledCents, locale)}
                </td>
                <td className={`tabular py-2 pl-3 text-right font-semibold ${tone(row.netCents)}`}>
                  {signed(row.netCents, locale)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="rule-double">
              <td className="py-2 pr-3 font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase">
                {t('balances.total')}
              </td>
              <td className="tabular px-3 py-2 text-right text-ink-faint">
                {amount(totals.contributedCents)}
              </td>
              <td className="tabular px-3 py-2 text-right font-semibold">
                {amount(totals.paidCents)}
              </td>
              <td className="tabular px-3 py-2 text-right font-semibold">
                {amount(totals.chargedCents)}
              </td>
              <td className="tabular px-3 py-2 text-right font-semibold">
                {signed(totals.settledCents, locale)}
              </td>
              <td className="tabular py-2 pl-3 text-right text-base font-semibold">
                {amount(totals.netCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
