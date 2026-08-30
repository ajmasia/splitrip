'use server'

import { revalidatePath } from 'next/cache'

import { amountCopyKey, errorCopyKey } from '@/lib/errors'
import type { CopyKey } from '@/lib/i18n'
import { parseAmount } from '@/lib/money/amount'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type RecordPaymentState = {
  error: CopyKey | null
  /**
   * When the payment went in. Handing the same amount over twice is an ordinary thing to do, so the
   * form cannot tell one success from the next by its contents alone.
   */
  at: number
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

/**
 * Somebody handed somebody else money. The amount is whatever was typed rather than whatever the
 * settlement proposed: a payment on account is an ordinary payment, and nothing here knows what
 * anybody owes — the balances absorb the amount and the proposal is recomputed from them.
 */
export async function recordPayment(
  _previous: RecordPaymentState,
  formData: FormData,
): Promise<RecordPaymentState> {
  const tripId = text(formData.get('trip_id'))

  const amount = parseAmount(text(formData.get('amount')))
  if (!amount.ok) return { error: amountCopyKey(amount.reason), at: 0 }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('record_payment', {
    p_trip_id: tripId,
    p_from_participant_id: text(formData.get('from_participant_id')),
    p_to_participant_id: text(formData.get('to_participant_id')),
    p_amount_cents: amount.amountCents,
    p_paid_on: text(formData.get('paid_on')).trim() || null,
  })

  if (error) return { error: errorCopyKey(error.code), at: 0 }

  revalidatePath(`/trips/${tripId}/balances`)
  return { error: null, at: Date.now() }
}
