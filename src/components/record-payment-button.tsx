'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { recordPayment, type RecordPaymentState } from '@/app/actions/payments'
import { intlLocale, translator, type Locale } from '@/lib/i18n'
import { amountForField } from '@/lib/money/amount'
import type { SettlementLine } from '@/lib/trips/settlement'

const EMPTY: RecordPaymentState = { error: null, at: 0 }

/**
 * Marks one line of the settlement as paid.
 *
 * The amount comes in filled with what the proposal asks for and stays editable, which is the whole
 * of what a partial payment needs: handing over 25.00 of a 40.00 debt is typing 25 into a field that
 * already says 40. The balances take it from there and the proposal comes back with the remainder.
 */
export function RecordPaymentButton({
  line,
  tripId,
  locale,
}: {
  line: SettlementLine
  tripId: string
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(recordPayment, EMPTY)
  const [open, setOpen] = useState(false)
  const amountField = useRef<HTMLInputElement>(null)
  const lastRecorded = useRef(0)

  // The payment went in, so the line it settles is about to be gone or smaller. Closing the form is
  // what says so; leaving it open would invite handing the same money over twice.
  useEffect(() => {
    if (state.at === 0 || state.at === lastRecorded.current) return
    lastRecorded.current = state.at
    setOpen(false)
  }, [state.at])

  useEffect(() => {
    if (open) amountField.current?.select()
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('payment.record.label', { from: line.fromName, to: line.toName })}
        className="min-h-touch w-fit cursor-pointer self-end rounded-card border border-rule px-3 text-sm text-ink-soft"
      >
        {t('payment.record')}
      </button>
    )
  }

  return (
    <form action={action} className="flex w-full flex-col gap-2">
      <input type="hidden" name="trip_id" value={tripId} />
      <input type="hidden" name="from_participant_id" value={line.fromParticipantId} />
      <input type="hidden" name="to_participant_id" value={line.toParticipantId} />

      <label
        htmlFor={`payment-${line.fromParticipantId}-${line.toParticipantId}`}
        className="text-sm font-medium"
      >
        {t('payment.amount.label', { from: line.fromName, to: line.toName })}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={amountField}
          id={`payment-${line.fromParticipantId}-${line.toParticipantId}`}
          name="amount"
          defaultValue={amountForField(line.amountCents, intlLocale(locale))}
          required
          inputMode="decimal"
          autoComplete="off"
          className="tabular min-h-touch w-28 rounded-card border border-rule bg-surface px-3 text-ink"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch cursor-pointer rounded-card bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? t('payment.pending') : t('payment.submit')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-touch cursor-pointer rounded-card px-3 text-sm text-ink-soft"
        >
          {t('payment.cancel')}
        </button>
      </div>
      <span className="text-sm text-ink-soft">{t('payment.amount.hint')}</span>
      {state.error ? (
        <p role="alert" className="text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  )
}
