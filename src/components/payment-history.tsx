import { Pill } from '@/components/pill'
import { VoidPaymentButton } from '@/components/void-payment-button'
import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatShortDate } from '@/lib/i18n/format'
import { formatAmount } from '@/lib/money/amount'
import type { TripPayment } from '@/lib/trips/queries'

/**
 * What the group has actually handed over, as opposed to what the settlement proposes. Stacked for
 * a thumb and tabular for a desk, both in the document with CSS choosing between them.
 *
 * A voided payment keeps its place, struck out and labelled: the database refuses to say why a
 * balance moved back if the row it moved with has vanished.
 */
export function PaymentHistory({
  payments,
  tripId,
  yourParticipantId,
  organising,
  voiding,
  locale,
  t,
}: {
  payments: TripPayment[]
  tripId: string
  yourParticipantId: string | null
  organising: boolean
  /** A closed trip keeps its history and takes no more corrections. */
  voiding: boolean
  locale: Locale
  t: Translate
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const day = (paidOn: string) => formatShortDate(paidOn, locale)
  const mayVoid = (payment: TripPayment) =>
    voiding && !payment.voided && (organising || payment.createdBy === yourParticipantId)

  if (payments.length === 0) {
    return (
      <div className="flex max-w-prose flex-col gap-2 rounded-card border border-rule bg-surface p-5">
        <h3 className="text-lg font-semibold">{t('payments.empty.title')}</h3>
        <p className="text-ink-soft">{t('payments.empty.body')}</p>
      </div>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-3 wide:hidden">
        {payments.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-col gap-1 rounded-card border border-rule bg-surface p-3"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className={`font-semibold ${payment.voided ? 'line-through' : ''}`}>
                {t('settlement.line', { from: payment.fromName, to: payment.toName })}
              </span>
              <span className={`tabular font-semibold ${payment.voided ? 'line-through' : ''}`}>
                {amount(payment.amountCents)}
              </span>
            </span>
            <span className="text-sm text-ink-soft">{day(payment.paidOn)}</span>
            {payment.voided ? (
              <span className="pt-1">
                <Pill tone="quiet">{t('payments.voided')}</Pill>
              </span>
            ) : null}
            {mayVoid(payment) ? (
              <VoidPaymentButton
                paymentId={payment.id}
                tripId={tripId}
                from={payment.fromName}
                to={payment.toName}
                locale={locale}
              />
            ) : null}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto wide:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-left font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase">
              <th scope="col" className="py-2 pr-3 font-medium">
                {t('payments.column.date')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('payments.column.payer')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('payments.column.payee')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t('payments.column.amount')}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                <span className="sr-only">{t('payments.column.action')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className={`border-b border-rule ${payment.voided ? 'text-ink-faint' : ''}`}
              >
                <td className="tabular py-2 pr-3 whitespace-nowrap text-ink-soft">
                  {day(payment.paidOn)}
                </td>
                <td className={`px-3 py-2 font-medium ${payment.voided ? 'line-through' : ''}`}>
                  {payment.fromName}
                </td>
                <td className={`px-3 py-2 ${payment.voided ? 'line-through' : ''}`}>
                  {payment.toName}
                  {payment.voided ? (
                    <span className="pl-2 no-underline">
                      <Pill tone="quiet">{t('payments.voided')}</Pill>
                    </span>
                  ) : null}
                </td>
                <td
                  className={`tabular px-3 py-2 text-right font-medium ${payment.voided ? 'line-through' : ''}`}
                >
                  {amount(payment.amountCents)}
                </td>
                <td className="py-2 pl-3 text-right">
                  {mayVoid(payment) ? (
                    <VoidPaymentButton
                      paymentId={payment.id}
                      tripId={tripId}
                      from={payment.fromName}
                      to={payment.toName}
                      locale={locale}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
