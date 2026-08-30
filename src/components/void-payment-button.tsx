'use client'

import { useActionState } from 'react'

import { voidPayment, type VoidPaymentState } from '@/app/actions/payments'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: VoidPaymentState = { error: null }

export function VoidPaymentButton({
  paymentId,
  tripId,
  from,
  to,
  locale,
}: {
  paymentId: string
  tripId: string
  from: string
  to: string
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(voidPayment, EMPTY)

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="payment_id" value={paymentId} />
      <input type="hidden" name="trip_id" value={tripId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t('payments.void.label', { from, to })}
        className="min-h-touch cursor-pointer rounded-card border border-rule px-3 text-sm text-ink-soft disabled:opacity-50"
      >
        {pending ? t('payments.voiding') : t('payments.void')}
      </button>
      {state.error ? (
        <p role="alert" className="text-right text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  )
}
