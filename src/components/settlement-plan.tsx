import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatAmount } from '@/lib/money/amount'
import type { SettlementLine } from '@/lib/trips/settlement'

/**
 * The transfers that close the trip, set as a bill sets its lines: what is owed on the left, the
 * figure on the right, and the dotted run between them that keeps the eye on the same row.
 */
export function SettlementPlan({
  plan,
  locale,
  t,
}: {
  plan: SettlementLine[]
  locale: Locale
  t: Translate
}) {
  if (plan.length === 0) {
    return (
      <div className="flex max-w-prose flex-col gap-2 rounded-card border border-rule bg-surface p-5">
        <h3 className="text-lg font-semibold">{t('settlement.settled.title')}</h3>
        <p className="text-ink-soft">{t('settlement.settled.body')}</p>
      </div>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {plan.map((line, index) => (
          <li
            key={`${line.fromName}-${line.toName}-${index}`}
            className="flex flex-wrap items-baseline gap-x-2"
          >
            <span className={line.yours === null ? '' : 'font-semibold'}>
              {t('settlement.line', { from: line.fromName, to: line.toName })}
            </span>
            <span className="leader" aria-hidden="true" />
            <span
              className={`tabular ${line.yours === null ? '' : 'font-semibold'} ${
                line.yours === 'pay' ? 'text-debt' : ''
              }`}
            >
              {formatAmount(line.amountCents, intlLocale(locale))}
            </span>
          </li>
        ))}
      </ul>
      <p className="max-w-prose text-sm text-ink-soft">
        {plan.length === 1
          ? t('settlement.count.one')
          : t('settlement.count.other', { count: plan.length })}
      </p>
    </>
  )
}
