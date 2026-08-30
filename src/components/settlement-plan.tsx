import { RecordPaymentButton } from '@/components/record-payment-button'
import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatAmount } from '@/lib/money/amount'
import type { SettlementLine } from '@/lib/trips/settlement'

/**
 * The transfers that close the trip, set as a bill sets its lines: what is owed on the left, the
 * figure on the right, and the dotted run between them that keeps the eye on the same row.
 *
 * A line can be marked paid where the reader has business with it: their own, always, and every
 * line for an organiser, who is the one likely to be told "I gave her the cash" and to write it
 * down for somebody else.
 */
export function SettlementPlan({
  plan,
  tripId,
  organising,
  recording,
  locale,
  t,
}: {
  plan: SettlementLine[]
  tripId: string
  organising: boolean
  /** A closed trip keeps its proposal on screen and takes no more payments. */
  recording: boolean
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
      <ul className="flex flex-col">
        {plan.map((line, index) => (
          <li
            key={`${line.fromParticipantId}-${line.toParticipantId}-${index}`}
            className="flex flex-col gap-2 border-b border-rule py-2 last:border-b-0"
          >
            <span className="flex flex-wrap items-baseline gap-x-2">
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
            </span>
            {recording && (organising || line.yours !== null) ? (
              <RecordPaymentButton line={line} tripId={tripId} locale={locale} />
            ) : null}
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
