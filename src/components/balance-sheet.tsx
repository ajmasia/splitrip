import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatAmount } from '@/lib/money/amount'
import type { ParticipantBalance } from '@/lib/trips/queries'

/**
 * A balance is read against the other balances on the sheet, so the sign is part of the figure and
 * not an accident of the formatter: `Intl` writes the minus and says nothing about a plus, which
 * would leave "155,78 €" and "-275,51 €" looking like two different kinds of number.
 */
function signed(netCents: number, locale: Locale) {
  const amount = formatAmount(netCents, intlLocale(locale))
  return netCents > 0 ? `+${amount}` : amount
}

function position(netCents: number, t: Translate) {
  if (netCents < 0) return t('balances.owes')
  if (netCents > 0) return t('balances.owed')
  return t('balances.settled')
}

/** Red says it first, the word says it too: colour alone is not a statement everybody can read. */
function tone(netCents: number) {
  return netCents < 0 ? 'text-debt' : ''
}

/**
 * The trip's accounts as a bill sets them: everyone's position, and a double rule above the sum,
 * which is zero whenever the arithmetic holds. Stacked for a thumb and tabular for a desk, both in
 * the document with CSS choosing between them, so the first paint is never the wrong one.
 */
export function BalanceSheet({
  balances,
  locale,
  t,
}: {
  balances: ParticipantBalance[]
  locale: Locale
  t: Translate
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const total = balances.reduce((sum, balance) => sum + balance.netCents, 0)

  return (
    <>
      <ul className="flex flex-col gap-3 wide:hidden">
        {balances.map((balance) => (
          <li
            key={balance.participantId}
            className="flex flex-col gap-1 rounded-card border border-rule bg-surface p-3"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">
                {balance.displayName}
                {balance.isYou ? <span className="text-ink-soft"> ({t('trip.you')})</span> : null}
              </span>
              <span className={`tabular font-semibold ${tone(balance.netCents)}`}>
                {signed(balance.netCents, locale)}
              </span>
            </span>
            <span className="flex items-baseline justify-between gap-3 text-sm text-ink-soft">
              <span>
                {t('balances.column.paid')} {amount(balance.paidCents)} ·{' '}
                {t('balances.column.charged')} {amount(balance.chargedCents)}
              </span>
              <span
                className={`font-mono text-[0.6875rem] tracking-wider uppercase ${tone(balance.netCents)}`}
              >
                {position(balance.netCents, t)}
              </span>
            </span>
            {balance.contributedCents > 0 ? (
              <span className="text-sm text-ink-soft">
                {t('balances.contributed', { amount: amount(balance.contributedCents) })}
              </span>
            ) : null}
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-3 rule-double pt-2">
          <span className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('balances.total')}
          </span>
          <span className="tabular font-semibold">{amount(total)}</span>
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
                {t('balances.column.paid')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t('balances.column.charged')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('balances.column.state')}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t('balances.column.net')}
              </th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr key={balance.participantId} className="border-b border-rule">
                <td className="py-2 pr-3 font-medium">
                  {balance.displayName}
                  {balance.isYou ? <span className="text-ink-soft"> ({t('trip.you')})</span> : null}
                  {balance.contributedCents > 0 ? (
                    <span className="block text-xs font-normal text-ink-soft">
                      {t('balances.contributed', { amount: amount(balance.contributedCents) })}
                    </span>
                  ) : null}
                </td>
                <td className="tabular px-3 py-2 text-right text-ink-soft">
                  {amount(balance.paidCents)}
                </td>
                <td className="tabular px-3 py-2 text-right text-ink-soft">
                  {amount(balance.chargedCents)}
                </td>
                <td className={`px-3 py-2 ${tone(balance.netCents) || 'text-ink-soft'}`}>
                  {position(balance.netCents, t)}
                </td>
                <td
                  className={`tabular py-2 pl-3 text-right font-semibold ${tone(balance.netCents)}`}
                >
                  {signed(balance.netCents, locale)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="rule-double font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase">
              <td className="py-2 pr-3">{t('balances.total')}</td>
              <td />
              <td />
              <td />
              <td className="tabular py-2 pl-3 text-right text-base font-semibold text-ink normal-case">
                {amount(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
